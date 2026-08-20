export const VISION_MODEL='@cf/meta/llama-4-scout-17b-16e-instruct';

export const VISION_PROMPT=`You are a Xiangqi board reconstruction vision system. Inspect the image and return ONLY one JSON object with: fen, sideToMove, confidence, orientation, boardCorners, notes.\nRules:\n- Board is 9 files by 10 ranks.\n- FEN uses r,n,b,a,k,c,p for black and uppercase for red. Exactly 10 slash-separated ranks, then space and w for red-to-move or b for black-to-move.\n- sideToMove is "red" or "black". If turn is not visually knowable, infer cautiously from move indicators/history and lower confidence.\n- confidence is 0..1.\n- orientation is red-bottom, black-bottom, red-left, black-left, or unknown.\n- boardCorners is either null or four image-relative normalized points in order top-left, top-right, bottom-right, bottom-left, each {x,y} in 0..1.\n- Never invent hidden pieces. If occluded/ambiguous, lower confidence and mention it in notes.`;

function extractText(result){
  if(typeof result==='string') return result;
  if(typeof result?.response==='string') return result.response;
  if(typeof result?.result?.response==='string') return result.result.response;
  if(Array.isArray(result?.choices)&&typeof result.choices[0]?.message?.content==='string') return result.choices[0].message.content;
  return JSON.stringify(result);
}

function dataUrlBytes(dataUrl){
  const comma=dataUrl.indexOf(',');
  const raw=comma>=0?dataUrl.slice(comma+1):dataUrl;
  if(typeof atob==='function'){
    const bin=atob(raw); return Array.from(bin,c=>c.charCodeAt(0));
  }
  return Array.from(Buffer.from(raw,'base64'));
}

export function createCloudflareAiRunner(env){
  if(!env?.AI?.run) return null;
  return {
    async recognize({imageDataUrl,previousFen,sideToMove}){
      const context=previousFen?`Previous trusted FEN: ${previousFen}. Expected side before transition: ${sideToMove||'unknown'}.`:'';
      const prompt=`${VISION_PROMPT}\n${context}`;
      try{
        const result=await env.AI.run(VISION_MODEL,{
          messages:[
            {role:'system',content:'Return strict JSON only.'},
            {role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageDataUrl}}]}
          ],
          response_format:{type:'json_object'}
        });
        return extractText(result);
      }catch(firstError){
        const result=await env.AI.run(VISION_MODEL,{prompt,image:dataUrlBytes(imageDataUrl)});
        return extractText(result);
      }
    },
    async explain({fen,lines}){
      const result=await env.AI.run(VISION_MODEL,{messages:[{role:'system',content:'Bạn là huấn luyện viên cờ tướng. Giải thích ngắn, rõ bằng tiếng Việt; không bịa xác suất.'},{role:'user',content:`FEN: ${fen}\nCác dòng engine đã xác thực: ${JSON.stringify(lines)}\nGiải thích nước tốt nhất, ý đồ và phản ứng đáng chú ý.`}]});
      return extractText(result);
    }
  };
}
