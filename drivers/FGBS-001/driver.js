'use strict';

const Homey = require('homey');

class FibaroUniversalBinarySensorDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getConditionCard('FGBS-001_i1')
      .registerRunListener((args, state) => {
        return args.device.getCapabilityValue('alarm_generic.contact1');
      });

    this.homey.flow.getConditionCard('FGBS-001_i2')
      .registerRunListener((args, state) => {
        return args.device.getCapabilityValue('alarm_generic.contact2');
      });
  }

}

module.exports = FibaroUniversalBinarySensorDriver;
