export const REALTIME_HEALTH_PROTOCOL = '2.0.0';

/** Decode the current Phoenix text/JSON-broadcast formats used by the browser SDK. */
function decodeMessage(data: unknown) {
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    if (bytes.length < 5 || bytes[0] !== 4 || bytes[4] !== 1) return null;
    const [topicLength,eventLength,metadataLength] = [bytes[1],bytes[2],bytes[3]];
    const payloadOffset = 5 + topicLength + eventLength + metadataLength;
    if(payloadOffset >= bytes.length) return null;
    const decoder = new TextDecoder();
    return { topic:decoder.decode(bytes.slice(5,5+topicLength)), event:'broadcast',
      payload:{event:decoder.decode(bytes.slice(5+topicLength,5+topicLength+eventLength)),payload:JSON.parse(decoder.decode(bytes.slice(payloadOffset)))}, ref:null };
  }
  const frame = JSON.parse(String(data));
  return Array.isArray(frame) ? {topic:frame[2],event:frame[3],payload:frame[4],ref:frame[1]} : null;
}

/** Ephemeral random channel only. No application rows, user sessions or customer content. */
export async function probeRealtime(baseUrl: string, publicKey: string) {
  const endpoint = new URL('/realtime/v1/websocket', baseUrl);
  let status = 0;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    status = response.status; await response.body?.cancel();
    if (status !== 401) return { healthy: false, endpointStatus: status, roundTrip: false };
    endpoint.protocol = 'wss:'; endpoint.searchParams.set('apikey', publicKey); endpoint.searchParams.set('vsn',REALTIME_HEALTH_PROTOCOL);
    const nonce = crypto.randomUUID(); const topic = `realtime:zivo-health-${nonce}`;
    const roundTrip = await new Promise<boolean>(resolve => {
      const socket = new WebSocket(endpoint);
      socket.binaryType = 'arraybuffer';
      const timer = setTimeout(() => done(false), 10000);
      let finished = false;
      function done(ok: boolean) { if (finished) return; finished = true; clearTimeout(timer); socket.close(); resolve(ok); }
      socket.onopen = () => socket.send(JSON.stringify(['1','1',topic,'phx_join',{config:{broadcast:{self:true,ack:true},presence:{enabled:false},postgres_changes:[]}}]));
      socket.onerror = () => done(false);
      socket.onclose = () => done(false);
      socket.onmessage = event => {
        try {
          const message = decodeMessage(event.data);
          if (!message) return;
          if (message.topic !== topic) return;
          if (message.event === 'phx_reply' && message.ref === '1') {
            if (message.payload?.status !== 'ok') return done(false);
            socket.send(JSON.stringify(['1','2',topic,'broadcast',{type:'broadcast',event:'health',payload:{nonce}}]));
          }
          if (message.event === 'broadcast' && message.payload?.event === 'health' && message.payload?.payload?.nonce === nonce) done(true);
        } catch { done(false); }
      };
    });
    return { healthy: roundTrip, endpointStatus: status, roundTrip };
  } catch { return { healthy:false, endpointStatus:status, roundTrip:false }; }
}
