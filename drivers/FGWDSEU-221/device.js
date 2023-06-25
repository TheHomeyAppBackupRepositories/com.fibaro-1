'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const CONFIGURED_MULTI_CHANNEL_ASSOCIATION = 'configuredMCAssociation';

class FibaroWalliSwitchDevice extends ZwaveDevice {

  async onNodeInit() {
    this.singleSwitchMode = this.getStoreValue('singleSwitchMode');

    if (this.singleSwitchMode === null) {
      this.singleSwitchMode = (this.node.productTypeId.value === 6657);

      if (this.singleSwitchMode === false) {
        await this._configureDoubleSwitchMode();
      } else {
        await this._configureSingleSwitchMode();
      }

      await this.setStoreValue('singleSwitchMode', this.singleSwitchMode)
        .catch(this.error);
    }

    if (!this.hasCapability('measure_power')) await this.addCapability('measure_power').catch(this.error);
    if (!this.hasCapability('meter_power')) await this.addCapability('meter_power').catch(this.error);

    if (this.singleSwitchMode) {
      this._registerSingleModeCapabilities();
    } else {
      this._registerDoubleModeCapabilities();
    }

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report
                && report.hasOwnProperty('Properties1')
                && report.hasOwnProperty('Scene Number')
                && report.Properties1.hasOwnProperty('Key Attributes')) {
        // Used for deprecated Flow card
        const button = String(report['Scene Number']);
        let presses;
        if (report.Properties1['Key Attributes'] === 'Key Held Down') {
          presses = '4';
        } else if (report.Properties1['Key Attributes'] === 'Key Released') {
          presses = '5';
        } else {
          presses = String(report.Properties1['Key Attributes'].match(/\d+/)[0]);
        }
        this.homey.flow.getDeviceTriggerCard('walli_switch_button_scenes')
          .trigger(this, {}, { button, presses })
          .catch(this.error);

        // Used for new Flow cards
        const buttonValue = { scene: report.Properties1['Key Attributes'] };
        if (report['Scene Number'] === 1) {
          this.homey.flow.getDeviceTriggerCard('FGWDSEU-221-top-switch')
            .trigger(this, null, buttonValue)
            .catch(this.error);
        } else if (report['Scene Number'] === 2) {
          this.homey.flow.getDeviceTriggerCard('FGWDSEU-221-bottom-switch')
            .trigger(this, null, buttonValue)
            .catch(this.error);
        }
      }
    });
  }

  /**
   * Remove unused capabilities in single switch mode
   *
   * @returns {Promise<void>}
   * @private
   */
  async _configureSingleSwitchMode() {
    this.log('Configuring Single Switch Mode');

    if (this.hasCapability('onoff.output2')) await this.removeCapability('onoff.output2');
    if (this.hasCapability('measure_power.output2')) await this.removeCapability('measure_power.output2');
    if (this.hasCapability('meter_power.output2')) await this.removeCapability('meter_power.output2');
  }

  /**
   * Method that sets a multi channel association (Multichannel instead of single channel, and checks for the correct capabilities
   *
   * @returns {Promise<void>}
   * @private
   */
  async _configureDoubleSwitchMode() {
    this.log('Configuring Double Switch Mode');
    const configuredMultiChannelReporting = this.getStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION);
    if (!configuredMultiChannelReporting && this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION) {
      if (this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET) {
        await this.node.CommandClass.COMMAND_CLASS_ASSOCIATION.ASSOCIATION_REMOVE(
          Buffer.from([1, 1]),
        );
        await this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET(
          Buffer.from([1, 0x00, 1, 1]),
        );
        await this.setSettings({ zw_group_1: '1.1' });
        await this.setStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION, true);

        this.log('Configured Walli Switch multi channel node reporting');
      }
    }

    if (!this.hasCapability('onoff.output2')) await this.addCapability('onoff.output2');
    if (!this.hasCapability('measure_power.output2')) await this.addCapability('measure_power.output2');
    if (!this.hasCapability('meter_power.output2')) await this.addCapability('meter_power.output2');
  }

  // When the Walli is in single switch mode
  _registerSingleModeCapabilities() {
    this.registerCapability('onoff.output1', 'SWITCH_BINARY');
    this.registerCapability('measure_power.output1', 'METER', {
      reportParserV3: report => this._measurePowerReportParser(1, report),
    });
    this.registerCapability('meter_power.output1', 'METER', {
      reportParserV3: report => this._meterPowerReportParser(1, report),
    });

    this.log('Walli Switch is in Single mode');
  }

  // When the Walli is in double switch mode
  _registerDoubleModeCapabilities() {
    this.registerCapability('onoff.output1', 'SWITCH_BINARY', { multiChannelNodeId: 1 });
    this.registerCapability('measure_power.output1', 'METER', {
      multiChannelNodeId: 1,
      reportParserV3: report => this._measurePowerReportParser(1, report),
    });
    this.registerCapability('meter_power.output1', 'METER', {
      multiChannelNodeId: 1,
      reportParserV3: report => this._meterPowerReportParser(1, report),
    });

    this.registerCapability('onoff.output2', 'SWITCH_BINARY', { multiChannelNodeId: 2 });
    this.registerCapability('measure_power.output2', 'METER', {
      multiChannelNodeId: 2,
      reportParserV3: report => this._measurePowerReportParser(2, report),
    });
    this.registerCapability('meter_power.output2', 'METER', {
      multiChannelNodeId: 2,
      reportParserV3: report => this._meterPowerReportParser(2, report),
    });

    this.log('Walli Switch is in Double mode');
  }

  /**
   * V3 parser for the Measure power report
   *
   * @param nodeId
   * @param report
   * @returns {{Properties2}|{Properties1}|*|null}
   * @private
   */
  _measurePowerReportParser(nodeId, report) {
    if (this.isValidPowerReport(report, 2)) {
      const measureValue = report['Meter Value (Parsed)'];

      this.updateCombinedPowerMeasure(nodeId, measureValue);

      this.homey.flow.getDeviceTriggerCard('walli_switch_power_changed')
        .trigger(this,
          { power: measureValue },
          { output: String(nodeId) })
        .catch(this.error);

      return measureValue;
    }

    return null;
  }

  updateCombinedPowerMeasure(nodeId, value) {
    const otherCapability = `measure_power.output${nodeId === 1 ? 2 : 1}`;
    const otherValue = this.hasCapability(otherCapability) ? this.getCapabilityValue(otherCapability) : 0;

    const combinedMeasureValue = otherValue + value;
    this._setCapabilityValueSafe('measure_power', combinedMeasureValue);
  }

  _meterPowerReportParser(nodeId, report) {
    if (this.isValidPowerReport(report, 0)) {
      const meterValue = report['Meter Value (Parsed)'];

      this.updateCombinedPowerMeter(nodeId, meterValue);

      return meterValue;
    }
    return null;
  }

  updateCombinedPowerMeter(nodeId, value) {
    const otherCapability = `meter_power.output${nodeId === 1 ? 2 : 1}`;
    const otherValue = this.hasCapability(otherCapability) ? this.getCapabilityValue(otherCapability) : 0;

    const combinedMeasureValue = otherValue + value;
    this._setCapabilityValueSafe('meter_power', combinedMeasureValue);
  }

  isValidPowerReport(report, scaleBits) {
    return report
        && report.hasOwnProperty('Properties1')
        && report.Properties1.hasOwnProperty('Meter Type')
        && (report.Properties1['Meter Type'] === 'Electric meter'
            || report.Properties1['Meter Type'] === 1)
        && report.Properties1.hasOwnProperty('Scale bit 2')
        && report.Properties1['Scale bit 2'] === false
        && report.hasOwnProperty('Properties2')
        && report.Properties2.hasOwnProperty('Scale bits 10')
        && report.Properties2['Scale bits 10'] === scaleBits;
  }

  async setOutputRunListener(args, state, value) {
    if (!args.output) return new Error('Missing arguments');
    const output = Number(args.output);

    if (output === 2 && this.singleSwitchMode) {
      throw new Error('Can\'t set output 2 in'
      + ' single switch mode!');
    }

    if (output === 1) {
      this.setCapabilityValue('onoff.output1', value);
      return this._setCapabilityValue('onoff.output1', 'SWITCH_BINARY', value);
    }
    if (output === 2) {
      this.setCapabilityValue('onoff.output2', value);
      return this._setCapabilityValue('onoff.output2', 'SWITCH_BINARY', value);
    }

    throw new Error('Incorrect output');
  }

  async isOnRunListener(output) {
    switch (output) {
      case '1':
        return this.getCapabilityValue('onoff.output1');
      case '2':
        return this.getCapabilityValue('onoff.output2');
      default:
        return false;
    }
  }

  async ledOnRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_on: args.color });
      return this.configurationSet({
        index: 11,
        size: 1,
        id: 'led_ring_color_on',
      }, Buffer.from([args.color]));
    }
  }

  async ledOffRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_off: args.color });
      return this.configurationSet({
        index: 12,
        size: 1,
        id: 'led_ring_color_off',
      }, Buffer.from([args.color]));
    }
  }

}

module.exports = FibaroWalliSwitchDevice;
