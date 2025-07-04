/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Web Messaging API for JavaScript
 * Durable Topic Endpoint consumer tutorial - DTE Consumer
 * Demonstrates receiving persistent messages from a DTE
 *
 * This sample shows how to consume messages from a Durable Topic Endpoint (DTE). The sample will
 * associate the DTE with the topic "tutorial/topic", so the `basic-samples/TopicPublisher` app can
 * be used to send messages to this topic.
 *
 * Prerequisite: the DTE with the name "tutorial/dte" must have been provisioned on the message
 * router vpn.  Ensure the DTE is enabled for both Incoming and Outgoing messages and set the
 * Permission to at least 'Consume'.
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var DTEConsumer = function (topicEndpointName, topicName) {
    'use strict';
    var consumer = {};
    consumer.session = null;
    consumer.messageConsumer = null;
    consumer.topicEndpointName = topicEndpointName;
    consumer.topicName = topicName;
    consumer.consuming = false;

    // Logger
    consumer.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
        var logTextArea = document.getElementById('log');
        logTextArea.value += timestamp + line + '\n';
        logTextArea.scrollTop = logTextArea.scrollHeight;
    };

    consumer.log('\n*** Consumer to DTE "' + consumer.topicEndpointName + '" is ready to connect ***');

    // Establishes connection to Solace PubSub+ Event Broker
    consumer.connect = function () {
        if (consumer.session !== null) {
            consumer.log('Already connected and ready to consume messages.');
            return;
        }
        var hosturl = document.getElementById('hosturl').value;
        // check for valid protocols
        if (hosturl.lastIndexOf('ws://', 0) !== 0 && hosturl.lastIndexOf('wss://', 0) !== 0 &&
            hosturl.lastIndexOf('http://', 0) !== 0 && hosturl.lastIndexOf('https://', 0) !== 0) {
            consumer.log('Invalid protocol - please use one of ws://, wss://, http://, https://');
            return;
        }
        var username = document.getElementById('username').value;
        var pass = document.getElementById('password').value;
        var vpn = document.getElementById('message-vpn').value;
        if (!hosturl || !username || !pass || !vpn) {
            consumer.log('Cannot connect: please specify all the Solace PubSub+ Event Broker properties.');
            return;
        }
        consumer.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        consumer.log('Client username: ' + username);
        consumer.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        // create session
        try {
            consumer.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            consumer.log(error.toString());
        }
        // define session event listeners
        consumer.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            consumer.log('=== Successfully connected and ready to start the message consumer. ===');
        });
        consumer.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            consumer.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        consumer.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            consumer.log('Disconnected.');
            consumer.consuming = false;
            if (consumer.session !== null) {
                consumer.session.dispose();
                consumer.session = null;
            }
        });

        consumer.connectToSolace();   

    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    consumer.connectToSolace = function () {
        try {
            consumer.session.connect();
        } catch (error) {
            consumer.log(error.toString());
        }
    };

    // Starts consuming from a Durable Topic Endpoint (DTE) on Solace PubSub+ Event Broker
    consumer.startConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.log('Already started consumer for DTE "' + consumer.topicEndpointName +
                    '" and ready to receive messages.');
            } else {
                consumer.log('Starting consumer for DTE: ' + consumer.topicEndpointName);
                consumer.log('The DTE will attract messages published to topic "' + consumer.topicName + '"');
                try {
                    // Create a message consumer
                    consumer.messageConsumer = consumer.session.createMessageConsumer({
                        topicEndpointSubscription: consumer.topicName,
                        queueDescriptor: { name: consumer.topicEndpointName, type: solace.QueueType.TOPIC_ENDPOINT },
                        // Not setting acknowledgeMode so it will default to ‘AUTO’ and therefore the on(MESSAGE)
                        // listener does not have to call acknowledge.
                    });
                    // Define message consumer event listeners
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
                        consumer.consuming = true;
                        consumer.log('=== Ready to receive messages. ===');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        consumer.consuming = false;
                        consumer.log('=== Error: the message consumer could not bind to DTE "' +
                            consumer.topicEndpointName +
                            '" ===\n   Ensure this Durable Topic Endpoint exists on the Solace PubSub+ Event Broker');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN, function () {
                        consumer.consuming = false;
                        consumer.log('=== An error happened, the message consumer is down ===');
                    });
                    // Define message event listener
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        if (message.getType() == solace.MessageType.TEXT) {  // in case someone sends text message
                            var payload = message.getSdtContainer().getValue();
                            consumer.log('Received TextMessage: "' + payload + '", details:\n' + message.dump());
                        } else {
                            consumer.log('Received message: "' + message.getBinaryAttachment() +
                                    '", details:\n' + message.dump());
                       }
                    });
                    // Connect the message consumer
                    consumer.messageConsumer.connect();
                } catch (error) {
                    consumer.log(error.toString());
                }
            }
        } else {
            consumer.log('Cannot start the DTE consumer because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Disconnects the consumer from DTE on Solace PubSub+ Event Broker
    consumer.stopConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
               consumer.consuming = false;
               consumer.log('Disconnecting consumption from DTE: ' + consumer.topicEndpointName);
                try {
                    consumer.messageConsumer.disconnect();
                    consumer.messageConsumer.dispose();
                } catch (error) {
                    consumer.log(error.toString());
                }
            } else {
                consumer.log('Cannot disconnect the consumer because it is not connected to DTE "' +
                    consumer.topicEndpointName + '"');
            }
        } else {
            consumer.log('Cannot disconnect the consumer because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    consumer.disconnect = function () {
        consumer.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (consumer.session !== null) {
            try {
                consumer.session.disconnect();
            } catch (error) {
                consumer.log(error.toString());
            }
        } else {
            consumer.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return consumer;
};
