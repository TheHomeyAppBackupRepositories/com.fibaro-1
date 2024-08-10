'use strict';

const Homey = require('homey');

class FibaroApp extends Homey.App {

  onInit() {
    this.log('Fibaro is running');

    this._registerMultiDriverFlowCards();
  }

  /**
   * These Flow cards are used by multiple drivers, therefore if we registered the run listener
   * in the Driver#onInit() they would overwrite each other. So we register them here instead.
   */
  _registerMultiDriverFlowCards() {
    this.actionStartDimLevelChange = this.homey.flow.getActionCard('FGD-21x_dim_startLevelChange');
    this.actionStartDimLevelChange.registerRunListener(
      this._actionStartDimLevelChangeRunListener.bind(this),
    );

    this.actionStopDimLevelChange = this.homey.flow.getActionCard('FGD-21x_dim_stopLevelChange');
    this.actionStopDimLevelChange.registerRunListener(
      this._actionStopDimLevelChangeRunListener.bind(this),
    );

    const walliLedOnAction = this.homey.flow.getActionCard('walli_led_on');
    walliLedOnAction.registerRunListener((args, state) => {
      return args.device.ledOnRunListener(args, state);
    });

    const walliLedOffAction = this.homey.flow.getActionCard('walli_led_off');
    walliLedOffAction.registerRunListener((args, state) => {
      return args.device.ledOffRunListener(args, state);
    });

    const windowCoveringsTiltSetAction = this.homey.flow.getActionCard('windowcoverings_tilt_set');
    windowCoveringsTiltSetAction.registerRunListener(args => {
      return args.device.triggerCapabilityListener('windowcoverings_tilt_set', args.position);
    });

    const windowCoveringsTiltStateAction = this.homey.flow.getActionCard('windowcoverings_tilt_state');
    windowCoveringsTiltStateAction.registerRunListener(args => {
      return args.device.triggerCapabilityListener(args.state === 'up' ? 'windowcoverings_tilt_up' : 'windowcoverings_tilt_down');
    });

    this.homey.flow.getDeviceTriggerCard('windowcoverings-switch-1')
        .registerRunListener((args, state) => state.scene === args.scene)

    this.homey.flow.getDeviceTriggerCard('windowcoverings-switch-2')
        .registerRunListener((args, state) => state.scene === args.scene)

  }

  async _actionStartDimLevelChangeRunListener({ device, direction, duration }, state) {
    if (typeof direction === 'undefined') {
      throw new Error('direction_property_missing');
    }

    device.log('FlowCardAction triggered to start dim level change in direction', direction);

    const { COMMAND_CLASS_SWITCH_MULTILEVEL } = device.node.CommandClass;
    if (!COMMAND_CLASS_SWITCH_MULTILEVEL) {
      throw new Error('Missing Command Class Switch Multilevel');
    }

    const upByte = parseInt(COMMAND_CLASS_SWITCH_MULTILEVEL.version, 10) > 2 ? 0x68 : 0x60;
    const properties1Byte = direction === '1' ? upByte : 0x20;

    return COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_START_LEVEL_CHANGE({
      'Properties1': Buffer.from([properties1Byte]),
      'Start Level': 0,
      'Dimming Duration': duration / 1000 || 255, // if no duration has been set, use factory default (255),
      'Step Size': 1,
    });
  }

  async _actionStopDimLevelChangeRunListener({ device }, state) {
    device.log('FlowCardAction triggered to stop dim level change');

    const { COMMAND_CLASS_SWITCH_MULTILEVEL } = device.node.CommandClass;
    if (!COMMAND_CLASS_SWITCH_MULTILEVEL) {
      throw new Error('Missing Command Class Switch Multilevel');
    }

    return COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_STOP_LEVEL_CHANGE({});
  }

}

module.exports = FibaroApp;
