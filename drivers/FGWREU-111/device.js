'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const TIMEOUT = 5000;

class FibaroRollerShutterDevice extends ZwaveDevice {

  async onNodeInit() {
    // Only add the tilt set when venetian blinds are selected
    if (this.getSetting('blind_type') === '2') {
      if (!this.hasCapability('windowcoverings_tilt_set')) {
        await this.addCapability('windowcoverings_tilt_set');
      }
    }

    this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });
    this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 2 });

    this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });

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

      return this._setCapabilityValue('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', tiltPosition);
    }
    throw new Error(this.homey.__('errors.tiltSet'));
  }

}

module.exports = FibaroRollerShutterDevice;
