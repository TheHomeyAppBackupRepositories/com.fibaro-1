'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const DEBOUNCE_TIMEOUT = 1000 * 2; // 2 minutes

class Button extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('measure_battery', 'BATTERY');

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      let debouncer = 0;

      if (report
        && report.Properties1.hasOwnProperty('Key Attributes')) {
        const buttonValue = { scene: report.Properties1['Key Attributes'] };
        if (buttonValue.scene === 'Key Released') {
          if (debouncer === 0) {
            this.homey.flow.getDeviceTriggerCard('FGPB-101')
              .trigger(this, null, buttonValue)
              .catch(this.error);

            debouncer++;
            this.homey.setTimeout(() => {
              debouncer = 0;
            }, DEBOUNCE_TIMEOUT);
          }
        } else {
          this.homey.flow.getDeviceTriggerCard('FGPB-101')
            .trigger(this, null, buttonValue)
            .catch(this.error);
        }
      }
    });
  }

}

module.exports = Button;
