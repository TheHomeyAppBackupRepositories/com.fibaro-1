'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const CONFIGURED_MULTI_CHANNEL_ASSOCIATION = 'configuredMCAssociation';

class FibaroDoubleSwitchTwoDevice extends ZwaveDevice {

  async onNodeInit() {
    // If not multi channel node this is the main node, use multi channel node 1 for that
    if (!this.node.isMultiChannelNode) {
      // Migration step to configure multi channel association reporting
      await this._configureMultiChannelNodeReporting();

      // Register capabilities on multi channel node 1
      this.registerCapability('onoff', 'SWITCH_BINARY', { multiChannelNodeId: 1 });
      this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
      this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });

      if (this.hasCommandClass('CENTRAL_SCENE')) {
        this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
          if (report.hasOwnProperty('Properties1')
            && report.Properties1.hasOwnProperty('Key Attributes')
            && report.hasOwnProperty('Scene Number')) {
            const state = {
              scene: report.Properties1['Key Attributes'],
            };

            if (report['Scene Number'] === 1) {
              this.homey.flow.getDeviceTriggerCard('FGS-223_S1')
                .trigger(this, null, state)
                .catch(this.error);
            } else if (report['Scene Number'] === 2) {
              this.homey.flow.getDeviceTriggerCard('FGS-223_S2')
                .trigger(this, null, state)
                .catch(this.error);
            }
          }
        });
      }
    } else {
      // Register capabilities (this will be registered on multi channel node 2)
      this.registerCapability('onoff', 'SWITCH_BINARY');
      if (this.hasCapability('meter_power')) {
        this.registerCapability('meter_power', 'METER');
      }
      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', 'METER');
      }
    }

    this.registerSetting('s1_kwh_report', this._kwhReportParser);
  }

  /**
	 * Method that sets a multi channel association (1.1) if not set before.
	 * @returns {Promise<void>}
	 * @private
	 */
  async _configureMultiChannelNodeReporting() {
    const configuredMultiChannelReporting = this.getStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION);
    if (!configuredMultiChannelReporting
      && this.getSetting('zw_group_1') !== '1.1'
      && this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION) {
      if (this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET) {
        await this.node.CommandClass.COMMAND_CLASS_ASSOCIATION.ASSOCIATION_REMOVE(Buffer.from([1, 1]));
        await this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET(
          Buffer.from([1, 0x00, 1, 1]),
        );
        await this.setSettings({ zw_group_1: '1.1' });
        await this.setStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION, true);
        this.log('configured multi channel node reporting');
      }
    }
  }

  async resetMeterFlowListener(args) {
    if (this.node.CommandClass.COMMAND_CLASS_METER) {
      return this.node.CommandClass.COMMAND_CLASS_METER.METER_RESET({});
    }
    throw new Error('This device does not support meter resets');
  }

  _kwhReportParser(newValue) {
    const kwh = Buffer.alloc(2);
    kwh.writeUIntBE([Math.round(newValue * 100)], 0, 2);
    return kwh;
  }

}

module.exports = FibaroDoubleSwitchTwoDevice;
