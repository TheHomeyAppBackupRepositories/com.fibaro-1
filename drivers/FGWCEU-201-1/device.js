'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroWalliController extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('measure_temperature', 'SENSOR_MULTILEVEL');
    this.registerCapability('measure_battery', 'BATTERY');

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      const buttonValue = { scene: report.Properties1['Key Attributes'] };
      if (report['Scene Number'] === 1) {
        this.homey.flow.getDeviceTriggerCard('FGWCEU-201-1_top_switch')
          .trigger(this, null, buttonValue)
          .catch(this.error);
      } else if (report['Scene Number'] === 2) {
        this.homey.flow.getDeviceTriggerCard('FGWCEU-201-1_bottom_switch')
          .trigger(this, null, buttonValue)
          .catch(this.error);
      }
    });
  }

}

module.exports = FibaroWalliController;
