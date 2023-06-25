'use strict';

const Homey = require('homey');

class FibaroWallPlugDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('FGWPE_led_on')
      .registerRunListener((args, state) => {
        return args.device.ledOnRunListener(args, state);
      });
    this.homey.flow.getActionCard('FGWPE_led_off')
      .registerRunListener((args, state) => {
        return args.device.ledOffRunListener(args, state);
      });
  }

}

module.exports = FibaroWallPlugDriver;
