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
        java_package: 'com.action.channel.protocol',
        java_outer_classname: 'ActionChannelProtocolFormat',
      },
      nested: {
        Result: {
          fields: {
            type: {
              type: 'string',
              id: 1,
            },
            data: {
              type: 'bytes',
              id: 2,
            },
            describe: {
              type: 'string',
              id: 3,
            },
            timestamp: {
              type: 'int64',
              id: 4,
            },
          },
        },
      },
    },
  });

export default $root;
