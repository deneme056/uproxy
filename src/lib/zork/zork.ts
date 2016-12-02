/// <reference path='../../../third_party/carrier/carrier.d.ts' />
/// <reference path='../../../third_party/wrtc/wrtc.d.ts' />

import * as net from 'net';
import * as node_server from '../socks/node/server';
import * as node_socket from '../socks/node/socket';
import * as socks_session from '../socks/session';
import * as wrtc from 'wrtc';

const SOCKS_HOST = '0.0.0.0';
const SOCKS_PORT = 9999;
const CMDSERVER_PORT = 0;
//const CMDSERVER_PORT = 9000;


// TODO: Verify this. Note discrepancy between `pcConfig` in the freedom
// implementation of zork, and `pc` in wrtc's test.js: https://git.io/v1sfy
const RTC_PEER_CONFIG = {
  iceServers: [
    {url: 'stun:stun.l.google.com:19302'},
    {url: 'stun:stun1.l.google.com:19302'},
    {url: 'stun:stun.services.mozilla.com'}
  ]
};

interface ParsedCommand {
  command: string;
  tokens: string[];
  orig: string;
}


// Rough lifecycle is to process single word commands such as "ping" until
// "get" or "give" is received, at which point the connection is handed off
// to a SocksToRtc or RtcToNet instance (and further input is treated as
// signaling channel messages).
const server = net.createServer((sock) => {

  const peerConn = new wrtc.RTCPeerConnection(RTC_PEER_CONFIG);

  /*
   * Start getting access from the client that just told us to.
   */
  const handleGet = (cmd: ParsedCommand) : boolean => {
    peerConn.onicecandidate = (event: any) => {
      const json = JSON.stringify(event);
      console.info('\nicecandidate from peerConn:', json);
      if (event.candidate) {
        console.info('\nevent.candidate -> sending event');
        sendReply(json);
      } else {
        console.error('event.candidate missing:', json);
      }
    }
    peerConn.createDataChannel('IGNORED').onopen = () => {
      console.info('connected!');
      new node_server.NodeSocksServer(SOCKS_HOST, SOCKS_PORT).onConnection((sessionId: any) => {
        const channel = peerConn.createDataChannel(sessionId);
        channel.onclose = () => {
          console.info(sessionId + ': channel closed (getter side)');
        };

        return {
          // SOCKS client -> datachannel
          handleDataFromSocksClient: (bytes: ArrayBuffer) => {
            channel.send(bytes);
          },
          // SOCKS client <- datachannel
          onDataForSocksClient: (callback: (buffer: ArrayBuffer) => void) => {
            channel.onmessage = (event: any) => {
              callback(event.data);
            };
            return this;
          },
          // the socks client has disconnected - close the datachannel.
          handleDisconnect: () => {
            console.info(sessionId + ': client disconnected, closing datachannel');
            channel.close();
          },
          onDisconnect: (callback: () => void) => {
            return this;
          }
        };
      }).listen().then(() => {
        console.log('curl -x socks5h://' + SOCKS_HOST + ':' + SOCKS_PORT + ' www.example.com');
      }, (e: any) => {
        console.error('failed to start SOCKS server', e);
      });
    };
    peerConn.createOffer((offer: any) => {
      const json = JSON.stringify(offer);
      console.info('\ncreated offer:', json);
      peerConn.setLocalDescription(offer);
      sendReply(json);
    }, console.error);

    return false;
  };

  /*
   * Start giving access to the client that just told us to.
   */
  const handleGive = (cmd: ParsedCommand) : boolean => {
    peerConn.onicecandidate = (event: any) => {
      const json = JSON.stringify(event);
      console.info('\nicecandidate from peerConn:', json);
      if (event.candidate) {
        console.info('event.candidate -> TODO');
      } else {
        console.error('event.candidate missing:', event);
      }
    };
    /*
    peerConn.ondatachannel = (event: any) => {
      const channel: any = event.channel;
      const sessionId = channel.label;

      const socksSession = new socks_session.SocksSession(sessionId);
      socksSession.onForwardingSocketRequired((host, port) => {
        const forwardingSocket = new node_socket.NodeForwardingSocket();
        return forwardingSocket.connect(host, port).then(() => {
          return forwardingSocket;
        });
      });

      // datachannel -> SOCKS session
      channel.onmessage = (event: any) => {
        socksSession.handleDataFromSocksClient(event.data);
      };
      // datachannel <- SOCKS session
      socksSession.onDataForSocksClient((bytes) => {
        // When too much is buffered, the channel closes/fails.
        // TODO: backpressure!
        const BUFFTHRESHOLD = 16000000;  // 16 megabytes
        if (channel.bufferedAmount < BUFFTHRESHOLD) {
          channel.send(bytes);
        } else {
          console.warn('channel congested, dropping bytes')
        }
      });

      socksSession.onDisconnect(() => {
      });
      channel.onclose = () => {
        console.info(sessionId + ': channel closed (giver side)');
      };
    };
    */
    return false;
  };

  const handlePing = (cmd: ParsedCommand) : boolean => {
    sendReply('ping');
    return true;
  };

  const handleTransform = (cmd: ParsedCommand) : boolean => {
    console.log('TODO: handleTransform');
    return true;
  };

  const handleXyzzy = (cmd: ParsedCommand) : boolean => {
    sendReply('Nothing happens.');
    return true;
  };

  const handleVersion = (cmd: ParsedCommand) : boolean => {
    console.log('TODO: handleVersion');
    return true;
  };

  const handleQuit = (cmd: ParsedCommand) : boolean => {
    sock.end();
    return false;
  };

  const handleGetters = (cmd: ParsedCommand) : boolean => {
    console.log('TODO: handleGetters');
    return true;
  };

  const handleCommandInvalid = (cmd: ParsedCommand) : boolean => {
    console.log('I don\'t understand that command. (' + cmd.command + ')');
    return true;
  }

  const cmdHandlerByCmdId: {[cmd: string]: Function} = {
    'get': handleGet,
    'give': handleGive,
    'ping': handlePing,
    'transform': handleTransform,
    'xyzzy': handleXyzzy,
    'version': handleVersion,
    'quit': handleQuit,
    'getters': handleGetters
  };

  let handlingCommands = 1;

  const MSG_DELIMITER = '\n';

  const sendReply = (msg: string) => {
    sock.write(msg + MSG_DELIMITER);
  };

  let currentCmdId: string = null;

  const handleCommand = (line: string) => {
    const parsed = parseCommandline(line);
    currentCmdId = parsed.command;
    const handler = cmdHandlerByCmdId[currentCmdId] || handleCommandInvalid;
    handlingCommands = handler(parsed) ? 1 : 0;
  };

  const parseCommandline = (cmdline: string) : ParsedCommand => {
    const toks = cmdline.split(/\W+/);
    const cmd = toks[0].toLowerCase();
    const parsed = {command: cmd, tokens: toks, orig: cmdline};
    return parsed;
  };

  const handleMsgDuringGive = (msg: string) => {
    console.log('\nin handleMsgDuringGive');
    const parsed = JSON.parse(msg);
    if (parsed.type === 'icecandidate') {
      console.log('\nicecandidate from sock:', msg);
      peerConn.addIceCandidate(parsed.candidate);
    } else if (parsed.type === 'offer') {
      console.log('\ngot offer:', msg);
      peerConn.setRemoteDescription(parsed);
      peerConn.createAnswer((answer: any) => {
        const answerJson = JSON.stringify(answer);
        console.info('\ncreated answer:', answerJson);
        peerConn.setLocalDescription(answer);
        sendReply(JSON.stringify(answer));
      }, console.error);
    } else {
      console.error('\nunexpected msg:', msg);
    }
  };

  const handleMsgDuringGet = (msg: string) => {
    console.log('\nin handleMsgDuringGet');
    const parsed = JSON.parse(msg);
    console.log('\nhandling msg:', msg);
    if (parsed.sdp) {
      console.log('\ngot sdp:', msg);
      console.log('\ncalling peerConn.setRemoteDescription(..)');
      peerConn.setRemoteDescription(parsed);
    }
  };

  const msgHandlerByCmdId: {[cmd: string]: Function} = {
    'get': handleMsgDuringGet,
    'give': handleMsgDuringGive
  };

  const endsWith = (haystack: string, needle: string) : boolean => {
    if (needle.length > haystack.length) return false;
    const end = haystack.substring(haystack.length - needle.length);
    return end === needle;
  };

  let msgs: string[] = [];
  let truncated = '';

  const onData = (data: Buffer) => {
    const chunk = data.toString();
    const reconst = truncated + chunk;
    let newmsgs = reconst.split(MSG_DELIMITER);
    if (!endsWith(reconst, MSG_DELIMITER)) {
      truncated = newmsgs.pop() || '';
    }
    while (newmsgs.length) {
      const msg = newmsgs.pop();
      msg && msgs.push(msg);
    }
    console.log('\nmsgs:', JSON.stringify(msgs));
    if (truncated) console.log('\ntruncated:', truncated);
    while (msgs.length) {
      const msg = msgs.pop();
      if (handlingCommands) {
        console.log('\ndispatching command:', msg);
        handleCommand(msg);
      } else {
        console.log('\ndispatching msg:', msg);
        const msgHandler = msgHandlerByCmdId[currentCmdId];
        if (msgHandler) {
          msgHandler(msg);
        } else {
          console.error('no message handler for command', currentCmdId);
        }
      }
    }
  };

  sock.on('data', onData);
});

server.listen(CMDSERVER_PORT);
console.log('command server listening at', CMDSERVER_PORT || server.address().port);
