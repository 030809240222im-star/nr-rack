export default {createTransport:()=>({sendMail:async m=>{console.log("  [mail] bcc="+m.bcc.join(",")+" / "+m.subject)}})};
