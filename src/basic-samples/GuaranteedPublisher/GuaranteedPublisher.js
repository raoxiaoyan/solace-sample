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
 * Publishing Guaranteed messages on a Topic tutorial - Guaranteed publisher
 * Demonstrates sending persistent messages on a topic
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var GuaranteedPublisher = function (topicName) {
    'use strict';
    var publisher = {};
    publisher.session = null;
    publisher.topicName = topicName;

    // Logger
    publisher.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
        var logTextArea = document.getElementById('log');
        logTextArea.value += timestamp + line + '\n';
        logTextArea.scrollTop = logTextArea.scrollHeight;
    };

    publisher.log('\n*** publisher to topic "' + publisher.topicName + '/{correlation_id}" is ready to connect ***');

    // Establishes connection to Solace PubSub+ Event Broker
    publisher.connect = function () {
        if (publisher.session !== null) {
            publisher.log('Already connected and ready to publish messages.');
            return;
        }
        var hosturl = document.getElementById('hosturl').value;
        // check for valid protocols
        if (hosturl.lastIndexOf('ws://', 0) !== 0 && hosturl.lastIndexOf('wss://', 0) !== 0 &&
            hosturl.lastIndexOf('http://', 0) !== 0 && hosturl.lastIndexOf('https://', 0) !== 0) {
            publisher.log('Invalid protocol - please use one of ws://, wss://, http://, https://');
            return;
        }
        var username = document.getElementById('username').value;
        var pass = document.getElementById('password').value;
        var vpn = document.getElementById('message-vpn').value;
        if (!hosturl || !username || !pass || !vpn) {
            publisher.log('Cannot connect: please specify all the Solace PubSub+ Event Broker properties.');
            return;
        }
        publisher.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        publisher.log('Client username: ' + username);
        publisher.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        // create session
        try {
            publisher.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
                publisherProperties: {
                  acknowledgeMode: solace.MessagePublisherAcknowledgeMode.PER_MESSAGE,
              }          
            });
        } catch (error) {
            publisher.log(error.toString());
        }
        // define session event listeners
        publisher.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            publisher.log('=== Successfully connected and ready to publish messages. ===');
                                   
                            
        });
        publisher.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            publisher.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        publisher.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            publisher.log('Disconnected.');
            if (publisher.session !== null) {
                publisher.session.dispose();
                publisher.session = null;
            }
        });
        publisher.session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, function (sessionEvent) {
            publisher.log('Delivery of message with correlation key = ' +
                sessionEvent.correlationKey.id + ' confirmed.');
        });
        publisher.session.on(solace.SessionEventCode.REJECTED_MESSAGE_ERROR, function (sessionEvent) {
            publisher.log('Delivery of message with correlation key = ' +
                sessionEvent.correlationKey.id + ' rejected, info: ' + sessionEvent.infoStr);
        });

        publisher.connectToSolace();   

    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    publisher.connectToSolace = function () {
        try {
            publisher.session.connect();
        } catch (error) {
            publisher.log(error.toString());
        }
    };

    // Publish one message
    publisher.publish = function () {
        if (publisher.session !== null) {
            var messageText = 'Sample Message';
            var binaryPayload = new TextEncoder().encode(messageText);
            var message = solace.SolclientFactory.createMessage();
            // message.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, messageText));  // TextMesage
            message.setBinaryAttachment(binaryPayload);  // BytesMessage
            message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
            // OPTIONAL: You can set a correlation key on the message and check for the correlation
            // in the ACKNOWLEDGE_MESSAGE callback. Define a correlation key object
            const correlationKey = {
                name: "MESSAGE_CORRELATIONKEY",
                id: Date.now()
            };
            message.setCorrelationKey(correlationKey);
            publisher.log('Publishing message "' + messageText + '" to topic "' + publisher.topicName + '/' + correlationKey.id + '"...');
            message.setDestination(solace.SolclientFactory.createTopicDestination(publisher.topicName + '/' + correlationKey.id));

            try {
                // Delivery not yet confirmed. See ConfirmedPublish.js
                publisher.session.send(message);
                publisher.log('Message sent with correlation key: ' + correlationKey.id);
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Cannot publish messages because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    publisher.disconnect = function () {
        publisher.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (publisher.session !== null) {
            try {
                publisher.session.disconnect();
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    publisher.clear = function () {
      publisher.log('Clearing log messages...');
      document.getElementById('log').value = "";
    }

    return publisher;
};
