'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const TIMEOUT = 5000;

class FibaroRollerShutter2Device extends ZwaveDevice {

  async onNodeInit() {
    // Only add the tilt set when venetian blinds are selected (because of legacy, don't enable on devices with the 'dim' capability)
    if (this.getSetting('operating_mode') === '2' && !this.hasCapability('dim')) {
      if (!this.hasCapability('windowcoverings_tilt_set')) {
        await this.addCapability('windowcoverings_tilt_set').catch(this.error);
      }
    }

    this.registerCapability('windowcoverings_state', 'SWITCH_BINARY');

    /*
     * WARNING: Please DO NOT remove the `dim` capability.
     * Legacy Fibaro Roller Shutter devices use this capability!
     */
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', {
        setParserV3: this._dimSetParser.bind(this),
        reportParser: this._dimReportParser.bind(this),
        reportParserOverride: true,
      });
      this.registerCapabilityListener('windowcoverings_tilt_set', value => this.setTilt(value, () => this.getSetting('invertWindowCoveringsTiltDirection')));
    } else if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'SWITCH_MULTILEVEL', {
        setParserV3: this._dimSetParser.bind(this),
        reportParser: this._dimReportParser.bind(this),
        reportParserOverride: true,
      });
    }

    this.registerCapability('measure_power', 'SENSOR_MULTILEVEL');

    this._registerSettings();
  }

  _registerSettings() {
    this.registerSetting('start_calibration', newValue => {
      if (newValue) {
        this.homey.setTimeout(() => {
          this.setSettings({ start_calibration: false })
            .catch(this.error);
        }, TIMEOUT);
      }

      return Buffer.from([newValue ? 1 : 0]);
    });

    this.registerSetting('operating_mode', newValue => {
      if (newValue === '2') {
        // Venetian blinds
        if (!this.hasCapability('windowcoverings_tilt_set')) {
          this.addCapability('windowcoverings_tilt_set')
            .catch(this.error);
        }
      } else if (this.hasCapability('windowcoverings_tilt_set')) {
        this.removeCapability('windowcoverings_tilt_set')
          .catch(this.error);
      }

      return newValue;
    });
  }

  _dimSetParser(value) {
    const invert = (typeof this.getSetting('invertWindowCoveringsDirection') === 'boolean') ? this.getSetting('invertWindowCoveringsDirection') : false;

    if (value > 1) {
      if (invert) {
        value = 0;
      } else value = 1;
    }

    if (invert) {
      value = (1 - value.toFixed(2)) * 99;
    } else {
      value *= 99;
    }

    return {
      Value: value,
      'Dimming Duration': 'Factory default',
    };
  }

  _dimReportParser(report) {
    const invert = (typeof this.getSetting('invertWindowCoveringsDirection') === 'boolean') ? this.getSetting('invertWindowCoveringsDirection') : false;

    const rawValue = report['Value (Raw)'];

    if (typeof rawValue === 'undefined' || rawValue[0] > 100) {
      return null;
    }
    if (invert) {
      return (100 - rawValue[0]) / 99;
    }

    return rawValue[0] / 99;
  }

  setTilt(value, getInvertTiltDirection) {
    if (this.hasCapability('windowcoverings_tilt_set')) {
      const invertTiltDirection = getInvertTiltDirection();

      const tiltValue = Math.min(Math.max(Math.floor((invertTiltDirection ? 1 - value : value) * 100), 0), 99);
      this.log('Tilt set', tiltValue);
      return this.node.sendCommand({
        commandClassId: 0x91,
        commandId: 0x01,
        params: Buffer.from([0x0F, 0x26, 0x01, 0x01, 0x00, tiltValue]),
      });
    }
    throw new Error(this.homey.__('errors.tiltSet'));
  }

}

module.exports = FibaroRollerShutter2Device;
