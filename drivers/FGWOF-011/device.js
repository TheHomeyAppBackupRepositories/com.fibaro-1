'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroWalliWallOutletDevice extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_BINARY');
    this.registerCapability('measure_power', 'METER');
    this.registerCapability('meter_power', 'METER');

    this.registerSetting('always_on', value => {
      // Flip 0 = 1, 1 = 0, because 0 is active and 1 is inactive
      return Buffer.from([value === true ? 0 : 1]);
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

}

module.exports = FibaroWalliWallOutletDevice;
