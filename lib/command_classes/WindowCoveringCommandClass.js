'use strict';

/**
 * The current implementation of the Window Covering Command Class v1 does not work, so this 'polyfill' is used for now
 */

class WindowCoveringCommandClass {

  /**
   * This command is used to request the status of a specified Covering Parameter.
   * @param node {ZwaveNode} The Z-Wave node to send the command to
   * @param parameterId {number} The parameter to get the value of
   * @returns {Promise<*>}
   */
  static async WINDOW_COVERING_GET(node, parameterId) {
    const parameterBuffer = Buffer.from([
      parameterId, // Parameter ID
    ]);
    return node.sendCommand({
      commandClassId: 0x6A,
      commandId: 0x03,
      params: parameterBuffer,
    });
  }

  /**
   * This command is used to control one or more parameters in a window covering device.
   * @param node {ZwaveNode} The Z-Wave node to send the command to
   * @param parameters {Map<number, number>} A map of <parameter id, parameter value> pairs
   * @param duration {number} As described in CC:0000.00.00.11.015 of V3.0 of the Z-Wave specification
   * @returns {Promise<*>}
   */
  static async WINDOW_COVERING_SET(node, parameters, duration = 0x00) {
    const commandHeaderBuffer = Buffer.from([
      parameters.size & 0b11111, // Reserved & Parameter Count
    ]);
    const parameterList = [...parameters.entries()].flat();
    const parameterBuffer = Buffer.from(parameterList);
    const durationBuffer = Buffer.from([
      duration, // Duration
    ]);
    return node.sendCommand({
      commandClassId: 0x6A,
      commandId: 0x05,
      params: Buffer.concat([commandHeaderBuffer, parameterBuffer, durationBuffer]),
    });
  }

  /**
   * This command is used to initiate a transition of one parameter to a new level.
   * @param node {ZwaveNode} The Z-Wave node to send the command to
   * @param parameterId {number} The parameter to start the level change for
   * @param up {boolean} Whether the change is up or down
   * @param duration {number} As described in CC:0000.00.00.11.015 of V3.0 of the Z-Wave specification
   * @returns {Promise<*>}
   */
  static async WINDOW_COVERING_START_LEVEL_CHANGE(node, parameterId, up, duration = 0x00) {
    const commandHeaderBuffer = Buffer.from([
      up ? 0b01000000 : 0b0, // Reserved & Up/Down
    ]);
    const parameterBuffer = Buffer.from([
      parameterId, // Parameter ID
      duration, // Duration
    ]);
    return node.sendCommand({
      commandClassId: 0x6A,
      commandId: 0x06,
      params: Buffer.concat([commandHeaderBuffer, parameterBuffer]),
    });
  }

  /**
   * This command is used to stop an ongoing transition.
   * @param node {ZwaveNode} The Z-Wave node to send the command to
   * @param parameterId {number} The parameter to stop the level change for
   * @returns {Promise<*>}
   */
  static async WINDOW_COVERING_STOP_LEVEL_CHANGE(node, parameterId) {
    const parameterBuffer = Buffer.from([
      parameterId, // Parameter ID
    ]);
    return node.sendCommand({
      commandClassId: 0x6A,
      commandId: 0x07,
      params: parameterBuffer,
    });
  }

}

module.exports = WindowCoveringCommandClass;
