'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroDoubleSmartModuleDevice extends ZwaveDevice {

  async onNodeInit() {
    // If not multi channel node this is the main node, use multi channel node 1 for that
    if (!this.node.isMultiChannelNode) {
      // Register capabilities on multi channel node 1
      this.registerCapability('onoff', 'SWITCH_BINARY', {
        multiChannelNodeId: 1,
      });

      if (this.hasCommandClass('CENTRAL_SCENE')) {
        this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
          if (report.hasOwnProperty('Properties1')
              && report.Properties1.hasOwnProperty('Key Attributes')
              && report.hasOwnProperty('Scene Number')) {
            const state = {
              scene: report.Properties1['Key Attributes'],
            };

            if (report['Scene Number'] === 1) {
              this.homey.flow.getDeviceTriggerCard('FGS-224_S1')
                .trigger(this, null, state)
                .catch(this.error);
            } else if (report['Scene Number'] === 2) {
              this.homey.flow.getDeviceTriggerCard('FGS-224_S2')
                .trigger(this, null, state)
                .catch(this.error);
            }
          }
        });
      }
    } else {
      // Register capabilities (this will be registered on multi channel node 2)
      this.registerCapability('onoff', 'SWITCH_BINARY');
    }
  }

}

module.exports = FibaroDoubleSmartModuleDevice;
