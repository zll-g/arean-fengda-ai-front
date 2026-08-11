'use strict';

import $protobuf from 'protobufjs/light';

var $root = ($protobuf.roots['default'] || ($protobuf.roots['default'] = new $protobuf.Root()))
  .setOptions({
    syntax: 'proto3',
  })
  .addJSON({
    protocol: {
      options: {
        optimize_for: 'SPEED',
        java_multiple_files: true,
        java_package: 'com.action.common.channel.context.protocol',
        java_outer_classname: 'ActionChannelProtocolFormat',
      },
      nested: {
        RANGE: {
          values: {
            OUTWARD: 0,
            INNER: 1,
          },
        },
        Result: {
          fields: {
            channelType: {
              type: 'RANGE',
              id: 1,
            },
            channelSign: {
              type: 'string',
              id: 2,
            },
            messageLevel: {
              type: 'string',
              id: 3,
            },
            messageType: {
              type: 'string',
              id: 4,
            },
            content: {
              type: 'bytes',
              id: 5,
            },
            describe: {
              type: 'string',
              id: 6,
            },
            timestamp: {
              type: 'int64',
              id: 7,
            },
          },
        },
      },
    },
  });

export default $root;
