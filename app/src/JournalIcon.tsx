import type { ReactNode } from 'react';

/** Decorative, accessibility-silent SVGs. Labels and click targets are owned by the existing UI. */
export type JournalIconName =
  | 'entry' | 'stop' | 'quantity' | 'target' | 'distance' | 'risk' | 'reward' | 'ratio' | 'result'
  | 'closed' | 'open' | 'partial' | 'reentry' | 'cancel' | 'noTrade' | 'missed' | 'pending'
  | 'session' | 'plan' | 'zone' | 'level' | 'evidence' | 'setup' | 'checklist' | 'rule' | 'review'
  | 'settings' | 'appearance' | 'backup' | 'restore' | 'export' | 'import' | 'screenshot'
  | 'help' | 'details' | 'analytics' | 'safety' | 'refresh' | 'save' | 'plus' | 'close';

type Shape = {path?:string; circle?:[number,number,number][]; rect?:[number,number,number,number][]; polyline?:string[]};
const shapes:Record<JournalIconName,Shape> = {
 entry:{path:'M5 19V7m-3 3 3-3 3 3M12 19V4m-3 3 3-3 3 3M19 19V10m-3 3 3-3 3 3'},
 stop:{path:'M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5L12 2Zm0 5v6m0 4h.01'},
 quantity:{path:'M12 2 3 7l9 5 9-5-9-5ZM3 12l9 5 9-5M3 17l9 5 9-5'},
 target:{circle:[[12,12,9],[12,12,5],[12,12,1.6]],path:'M20 4 12 12l-1-5'},
 distance:{path:'M3 8h18m-4-4 4 4-4 4M7 4 3 8l4 4M3 17h18m-4-4 4 4-4 4m4-4-4 4 4 4'},
 risk:{path:'M12 2v20M17.5 7c-1.5-2-9-2.5-10 .7-2 5 10 3 10 8 0 3.5-9.5 4-11 1'},
 reward:{rect:[[4,10,16,12],[3,7,18,4]],path:'M12 7v15M12 7c-4 0-8-5-4-6 3-1 4 4 4 6Zm0 0c4 0 8-5 4-6-3-1-4 4-4 6Z'},
 ratio:{path:'M12 3v18M4 7h16M5 7l-3 8h6L5 7Zm14 0-3 8h6l-3-8ZM8 21h8'},
 result:{path:'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4'},
 closed:{circle:[[12,12,10]],path:'m7 12 3.5 3.5L17 9'},
 open:{path:'m8 4 12 8-12 8V4Z'},
 partial:{rect:[[4,5,5,14],[15,5,5,14]]},
 reentry:{path:'M4 11a8 8 0 0 1 14-5l2 2m0-5v5h-5M20 13a8 8 0 0 1-14 5l-2-2m0 5v-5h5'},
 cancel:{circle:[[12,12,10]],path:'m8 8 8 8m0-8-8 8'},
 noTrade:{circle:[[12,12,10]],path:'M7 12h10'},
 missed:{path:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z',circle:[[12,12,3]]},
 pending:{circle:[[12,12,10]],path:'M12 6v7l5 3'},
 session:{rect:[[3,5,18,16]],path:'M7 2v6M17 2v6M3 11h18'},
 plan:{path:'M6 2h9l5 5v15H6V2Zm9 0v6h5M9 12h8m-8 4h8'},
 zone:{path:'M12 2 3 7l9 5 9-5-9-5ZM3 12l9 5 9-5M3 17l9 5 9-5'},
 level:{path:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z',circle:[[12,10,2.5]]},
 evidence:{circle:[[5,12,2],[19,5,2],[19,19,2]],path:'m7 11 10-5M7 13l10 5'},
 setup:{path:'M4 6h16M4 12h16M4 18h16'},
 checklist:{rect:[[4,3,16,19]],path:'m8 11 2 2 4-4m0 8h3'},
 rule:{path:'M5 22V2m0 1h14l-3 5 3 5H5'},
 review:{path:'M4 20h16M7 17l10-10 3 3-10 10H7v-3ZM15 5l3-3 4 4-3 3'},
 settings:{circle:[[12,12,3]],path:'M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3l-2-2 2-4 3 1 3-1 1-3Z'},
 appearance:{circle:[[12,12,10],[8,8,1],[15,7,1],[18,13,1],[7,15,1]],path:'M12 18c-3-2 1-5 4-2'},
 backup:{path:'M5 5h14v16H5V5ZM3 3h18M8 9h8m-8 4h8m-8 4h8'},
 restore:{path:'M4 11a8 8 0 1 1 2 6m-2 4v-7h7M12 7v5l3 2'},
 export:{path:'M12 16V2m-5 5 5-5 5 5M4 14v7h16v-7'},
 import:{path:'M12 2v14m-5-5 5 5 5-5M4 18v3h16v-3'},
 screenshot:{rect:[[2,5,20,16],[8,2,8,3]],circle:[[12,13,4]]},
 help:{circle:[[12,12,10]],path:'M9.5 9a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3h.01'},
 details:{circle:[[12,12,10]],path:'M12 10v7m0-11h.01'},
 analytics:{path:'M3 20h18M6 17V9m6 8V4m6 13v-6'},
 safety:{path:'M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5L12 2Zm-4 10 3 3 5-6'},
 refresh:{path:'M20 11a8 8 0 0 0-14-5L4 8m0-5v5h5M4 13a8 8 0 0 0 14 5l2-2m0 5v-5h-5'},
 save:{rect:[[3,3,18,18]],path:'M7 3v7h10V3M7 21v-7h10v7'},
 plus:{path:'M12 4v16M4 12h16'},
 close:{path:'M5 5l14 14M19 5 5 19'}
};
export function JournalIcon({name,className=''}:{name:JournalIconName;className?:string}):ReactNode{
 const shape=shapes[name];
 return <svg className={'ptjIcon ptjIcon-'+name+' '+className} width="21" height="21" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
  aria-hidden="true" focusable="false">
  {shape.path&&<path d={shape.path}/>}
  {shape.circle?.map(([cx,cy,r],i)=><circle key={'c'+i} cx={cx} cy={cy} r={r}/>)}
  {shape.rect?.map(([x,y,width,height],i)=><rect key={'r'+i} x={x} y={y} width={width} height={height} rx="1"/>)}
  {shape.polyline?.map((points,i)=><polyline key={'p'+i} points={points}/>)}
 </svg>;
}
