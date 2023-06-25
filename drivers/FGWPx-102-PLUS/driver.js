'use strict';

const Homey = require('homey');

class FibaroWallPlugPlusDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('FGWPx-102-PLUS_led_on')
      .registerRunListener(async (args, state) => {
        return args.device.ledOnRunListener(args, state);
      });
    this.homey.flow.getActionCard('FGWPx-102-PLUS_led_off')
      .registerRunListener(async (args, state) => {
        return args.device.ledOffRunListener(args, state);
      });
  }

}

module.exports = FibaroWallPlugPlusDriver;
