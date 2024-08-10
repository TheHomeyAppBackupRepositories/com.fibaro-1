'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const CONFIGURED_MULTI_CHANNEL_ASSOCIATION = 'configuredMCAssociation';
const TIMEOUT = 5000;

class FibaroRollerShutter3Device extends ZwaveDevice {

  async onNodeInit() {
    // Migration because of a no associationGroupsMultiChannel being defined in the driver.json
    await this._configureMultiChannelNodeReporting();

    // Only add the tilt set when venetian blinds are selected (because of legacy, don't enable on devices with the 'dim' capability)
    if (this.getSetting('blind_type') === '2' && !this.hasCapability('dim')) {
      if (!this.hasCapability('windowcoverings_tilt_set')) {
        await this.addCapability('windowcoverings_tilt_set').catch(this.error);
      }
    }

    this._registerCapabilities();
    this._registerReports();
    this._registerSettings();
  }

  /**
   * Method that sets a multi channel association (1.1) if not set before.
   * @returns {Promise<void>}
   * @private
   */
  async _configureMultiChannelNodeReporting() {
    const configuredMultiChannelReporting = this.getStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION);

    if (!configuredMultiChannelReporting && this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION) {
      if (this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET) {
        await this.node.CommandClass.COMMAND_CLASS_ASSOCIATION.ASSOCIATION_REMOVE(Buffer.from([1, 1]));
        await this.node.CommandClass.COMMAND_CLASS_MULTI_CHANNEL_ASSOCIATION.MULTI_CHANNEL_ASSOCIATION_SET(
          Buffer.from([1, 0x00, 1, 1]),
        );
        await this.setStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION, true);
        this.log('configured multi channel node reporting');
      }
    }
  }

  /**
   * Registers all the device Capabilities
   *
   * @private
   */
  _registerCapabilities() {
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });
      this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 2 });
    } else if (this.hasCapability('dim')) {
      /*
     * WARNING: Please DO NOT remove the `dim` capability.
     * Legacy Fibaro Roller Shutter devices use this capability!
     */
      this.registerCapability('dim', 'SWITCH_MULTILEVEL');
    }

    const configuredMultiChannelReporting = this.getStoreValue(CONFIGURED_MULTI_CHANNEL_ASSOCIATION);
    if (configuredMultiChannelReporting) {
      this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
      this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });
    } else {
      this.registerCapability('measure_power', 'METER');
      this.registerCapability('meter_power', 'METER');
    }
  }

  /**
   * Adds the report listeners for the device
   *
   * @private
   */
  _registerReports() {
    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report
        && report.hasOwnProperty('Properties1')
        && report.hasOwnProperty('Scene Number')
        && report.Properties1.hasOwnProperty('Key Attributes')) {
        const buttonValue = { scene: report.Properties1['Key Attributes'] };

        if (report['Scene Number'] === 1) {
          this.homey.flow.getDeviceTriggerCard('FGR-223-switch-1')
            .trigger(this, null, buttonValue)
            .catch(this.error);
        } else if (report['Scene Number'] === 2) {
          this.homey.flow.getDeviceTriggerCard('FGR-223-switch-2')
            .trigger(this, null, buttonValue)
            .catch(this.error);
        }
      }
    });
  }

  /**
   * Registers the custom settings parser
   *
   * @private
   */
  _registerSettings() {
    this.registerSetting('start_calibration', newValue => {
      if (newValue) {
        this.homey.setTimeout(() => {
          this.setSettings({ start_calibration: false })
            .catch(this.error);
        }, TIMEOUT);
      }

      return Buffer.from([newValue ? 2 : 0]);
    });

    this.registerSetting('blind_type', newValue => {
      if (newValue === '2') {
        if (!this.hasCapability('windowcoverings_tilt_set')) {
          this.addCapability('windowcoverings_tilt_set')
            .catch(this.error);
        }
      } else if (this.hasCapability('windowcoverings_tilt_set')) {
        this.removeCapability('windowcoverings_tilt_set')
          .catch(this.error);
      }
      return Buffer.from([newValue]);
    });
  }

  /**
   * Listener for the Tilt Flow
   *
   * @param args
   * @param state
   * @returns {Promise<void>}
   */
  async setTiltPositionListener(args, state) {
    if (this.hasCapability('windowcoverings_tilt_set')) {
      let tiltPosition = args.position;

      if (this.getSettings('invertWindowCoveringsTiltDirection') === true) {
        tiltPosition = 1 - tiltPosition;
      }

      this.setCapabilityValue('windowcoverings_tilt_set', tiltPosition).catch(this.error);
      return this._setCapabilityValue('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', tiltPosition);
    }
    throw new Error(this.homey.__('errors.tiltSet'));
  }

}

module.exports = FibaroRollerShutter3Device;
