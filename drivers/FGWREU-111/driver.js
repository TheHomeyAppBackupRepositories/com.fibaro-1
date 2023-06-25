'use strict';

const Homey = require('homey');

class FibaroWalliWalliRollerShutter extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('FGWREU_set_tilt')
      .registerRunListener((args, state) => {
        return args.device.setTiltPositionListener(args, state);
      });
  }

}

module.exports = FibaroWalliWalliRollerShutter;
