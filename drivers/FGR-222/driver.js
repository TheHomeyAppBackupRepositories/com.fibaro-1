'use strict';

const Homey = require('homey');

class FibaroRollerShutter2Driver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('FGR-222_set_tilt')
      .registerRunListener(args => {
        const { device, position } = args;
        return device.setTilt(position, () => device.getSetting('invertWindowCoveringsTiltDirection'));
      });
  }

}

module.exports = FibaroRollerShutter2Driver;
