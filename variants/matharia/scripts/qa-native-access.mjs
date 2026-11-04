// Isolated test fixture for the independent app. No live account or purchase.
import {loadEnv} from 'vite';
export async function installNativeAccessFixture(context) {
  const host = new URL(loadEnv('production',process.cwd(),'VITE_').VITE_SUPABASE_URL).hostname;
  await context.addInitScript(({host})=>{
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
      if(url.hostname===host)throw new Error('Native gameplay requested the shared account server: '+url.pathname);
      return originalFetch(input,init);
    };
    if(!localStorage.getItem('matharia-ios-player-v1'))localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Native QA',avatarId:'barratt',level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8]}));
    window.CapacitorCustomPlatform={name:'ios'};
    const methods=['status','purchase','restore','signInWithApple','manageSubscriptions','removeListener'];
    const status=()=>({active:true,configured:true,expiresAt:Date.now()+3600000,plans:[]});
    window.Capacitor={PluginHeaders:[{name:'MathariaServices',methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]},{name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]}],nativeCallback(){return 'native-qa-listener';},async nativePromise(plugin,method){if(plugin==='App')return {isActive:true};if(['status','restore'].includes(method))return status();return {};}};
  },{host});
}
