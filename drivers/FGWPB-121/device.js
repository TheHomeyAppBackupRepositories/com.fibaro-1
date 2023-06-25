'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroWallPlugPlus extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_BINARY', { multiChannelNodeId: 1 });
    this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });

    // Usb metering
    this.registerCapability('measure_power.usb', 'METER', { multiChannelNodeId: 2 });
    this.registerCapability('meter_power.usb', 'METER', { multiChannelNodeId: 2 });

    this.registerSetting('kwh_threshold_report', value => value * 100);
  }

  async ledOnRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_on: args.color });
      return this.configurationSet({
        index: 41,
        size: 1,
        id: 'led_ring_color_on',
      }, Buffer.from([args.color]));
    }
  }

  async ledOffRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_off: args.color });
      return this.configurationSet({
        index: 42,
        size: 1,
        id: 'led_ring_color_off',
      }, Buffer.from([args.color]));
    }
  }

}

module.exports = FibaroWallPlugPlus;
