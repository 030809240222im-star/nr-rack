const admin={initializeApp(){},credential:{cert:x=>Object.assign({},x,{getAccessToken:async()=>{if(!process.env.FAKE_TOKEN)throw new Error('no key');return {access_token:'t'}}})},app:()=>({}),auth:()=>({getUser:async uid=>({email:(uid==="g1"?"kowa0371@gmail.com":uid+"@x.jp"),emailVerified:true})})};
export default admin;
