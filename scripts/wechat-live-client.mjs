// 复用本机已授权CLI的同一skill-call协议和Codex客户端，保持会话以减少逐次启动开销。
export class WechatLiveClient {
  session=null;sequence=0;
  constructor(port=18121){this.url=`http://127.0.0.1:${port}/mcp`;}
  async request(message){
    const headers={'content-type':'application/json',accept:'application/json, text/event-stream','x-wechatide-mcp-entry':'skill-call'};
    if(this.session)headers['mcp-session-id']=this.session;
    const response=await fetch(this.url,{method:'POST',headers,body:JSON.stringify(message),signal:AbortSignal.timeout(30000)});
    if(response.headers.get('mcp-session-id'))this.session=response.headers.get('mcp-session-id');
    const raw=await response.text(),lines=raw.split('\n').filter(line=>line.startsWith('data: '));
    const body=JSON.parse(lines.length?lines.at(-1).slice(6):raw);
    if(!response.ok||body.error)throw Error(`微信工具拒绝或失败：${response.status} ${JSON.stringify(body.error??body)}`);
    return body.result;
  }
  async init(){return this.request({jsonrpc:'2.0',id:'init',method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'Codex',version:'1.0.0'}}});}
  async call(name,args){
    const result=await this.request({jsonrpc:'2.0',id:++this.sequence,method:'tools/call',params:{name,arguments:args}});
    let value=result.structuredContent;
    if(!value){
      const output=result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
      try{value=JSON.parse(output);}catch{value={success:!result.isError,text:output};}
    }
    if(result.isError||value.success===false)throw Error(JSON.stringify(value));return value;
  }
  async close(){if(this.session)await fetch(this.url,{method:'DELETE',headers:{'x-wechatide-mcp-entry':'skill-call','mcp-session-id':this.session}});}
}
