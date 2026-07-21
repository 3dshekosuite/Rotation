const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHIFTS=['Morning','Afternoon'];
const LS_KEY='shiftflow_pro_web_v1';
let state={employees:[],rules:{},settings:{weeklyDays:5,mode:'smart',iterations:1200,consecutiveOff:false,officeHolidays:[]},schedule:null,report:null,score:null,selectedId:null};

DAYS.forEach(d=>state.rules[d]={morning:3,afternoon:2,office:3,fromHome:2});

const $=id=>document.getElementById(id);
const save=()=>localStorage.setItem(LS_KEY,JSON.stringify(state));
const load=()=>{const x=localStorage.getItem(LS_KEY);if(x)state={...state,...JSON.parse(x)};};
const rand=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

function init(){
  load();
  buildDayChecks();
  buildOfficeHolidayChecks();
  buildRules();
  bind();
  renderAll();
}

function bind(){
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $('saveEmp').onclick=saveEmployee;
  $('clearEmp').onclick=clearEmp;
  $('deleteEmp').onclick=deleteEmp;
  $('saveRules').onclick=saveRules;
  $('generateBtn').onclick=generate;
  $('viewMode').onchange=renderSchedule;
  $('excelBtn').onclick=exportExcel;
  $('backupBtn').onclick=backup;
  $('restoreInput').onchange=restore;
  $('themeBtn').onclick=()=>document.body.classList.toggle('light');
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===id));

  const t={
    employees:['Employees','Add team members, teams, level, and restrictions.'],
    rules:['Rules','Set flexible shift requirements.'],
    schedule:['Schedule','Generate, view, and export the rota.'],
    report:['Report','Check matching and approximations.']
  };

  $('pageTitle').textContent=t[id][0];
  $('pageHint').textContent=t[id][1];
}

function buildDayChecks(){
  dayChecks.innerHTML=DAYS.map(d=>`
    <label class="check">
      <input type="checkbox" value="${d}"> ${d.slice(0,3)}
    </label>
  `).join('');
}

function buildRules(){
  rulesTable.innerHTML=
    ['Day','Morning','Afternoon','Office','From Home']
      .map(h=>`<div class="head">${h}</div>`).join('')
    +DAYS.map(d=>`
      <div class="day">${d}</div>
      <input data-day="${d}" data-k="morning" type="number" min="0">
      <input data-day="${d}" data-k="afternoon" type="number" min="0">
      <input data-day="${d}" data-k="office" type="number" min="0">
      <input data-day="${d}" data-k="fromHome" type="number" min="0">
    `).join('');
}

function buildOfficeHolidayChecks(){
  let box=$('officeHolidayChecks');

  if(!box){
    const settings=document.querySelector('#rules .rule-settings');
    if(!settings)return;

    const section=document.createElement('div');
    section.className='office-holidays';
    section.innerHTML=`
      <p class="mini-title">Office weekly holidays</p>
      <div id="officeHolidayChecks" class="checks"></div>
    `;

    settings.insertAdjacentElement('afterend',section);
    box=$('officeHolidayChecks');
  }

  box.innerHTML=DAYS.map(d=>`
    <label class="check">
      <input type="checkbox" value="${d}"> ${d.slice(0,3)}
    </label>
  `).join('');
}

function renderAll(){
  renderEmployees();
  renderRules();
  renderSchedule();
  renderReport();
}

function selectedUnavailable(){
  return [...dayChecks.querySelectorAll('input:checked')].map(i=>i.value);
}

function saveEmployee(){
  const name=empName.value.trim();
  if(!name)return alert('Employee name is required');

  const data={
    id:state.selectedId||crypto.randomUUID(),
    name,
    team:empTeam.value,
    role:empRole.value,
    homeOnly:homeOnly.checked,
    unavailable:selectedUnavailable()
  };

  const i=state.employees.findIndex(e=>e.id===data.id);
  if(i>=0)state.employees[i]=data;
  else state.employees.push(data);

  clearEmp();
  save();
  renderEmployees();
}

function clearEmp(){
  state.selectedId=null;
  empName.value='';
  empTeam.value='Team A';
  empRole.value='Junior';
  homeOnly.checked=false;
  dayChecks.querySelectorAll('input').forEach(i=>i.checked=false);
  document.querySelectorAll('.emp-row').forEach(r=>r.classList.remove('selected'));
}

function deleteEmp(){
  if(!state.selectedId)return alert('Choose employee first');

  state.employees=state.employees.filter(e=>e.id!==state.selectedId);
  clearEmp();
  save();
  renderEmployees();
}

function renderEmployees(){
  empList.innerHTML=state.employees.map(e=>`
    <div class="emp-row ${e.id===state.selectedId?'selected':''}" data-id="${e.id}">
      <div>
        <div class="emp-name">${e.name}</div>
        <div class="emp-meta">
          ${e.team} • ${e.role}${e.homeOnly?' • Home Only':''}
          • Blocked: ${e.unavailable?.map(d=>d.slice(0,3)).join(', ')||'None'}
        </div>
      </div>
      <button class="soft">Edit</button>
    </div>
  `).join('')||'<p class="muted">No employees yet.</p>';

  document.querySelectorAll('.emp-row').forEach(r=>r.onclick=()=>{
    const e=state.employees.find(x=>x.id===r.dataset.id);
    state.selectedId=e.id;
    empName.value=e.name;
    empTeam.value=e.team;
    empRole.value=e.role;
    homeOnly.checked=!!e.homeOnly;
    dayChecks.querySelectorAll('input').forEach(i=>i.checked=e.unavailable.includes(i.value));
    renderEmployees();
  });
}

function saveRules(){
  state.settings={
    weeklyDays:+weeklyDays.value,
    mode:mode.value,
    iterations:+iterations.value,
    consecutiveOff:consecutiveOff.checked,
    officeHolidays:[...$('officeHolidayChecks').querySelectorAll('input:checked')].map(i=>i.value)
  };

  rulesTable.querySelectorAll('input').forEach(i=>{
    state.rules[i.dataset.day][i.dataset.k]=+i.value||0;
  });

  save();
  alert('Rules saved');
}

function renderRules(){
  state.settings.officeHolidays=state.settings.officeHolidays||[];

  weeklyDays.value=state.settings.weeklyDays;
  mode.value=state.settings.mode;
  iterations.value=state.settings.iterations;
  consecutiveOff.checked=state.settings.consecutiveOff;

  $('officeHolidayChecks').querySelectorAll('input').forEach(i=>{
    i.checked=state.settings.officeHolidays.includes(i.value);
  });

  rulesTable.querySelectorAll('input').forEach(i=>{
    i.value=state.rules[i.dataset.day][i.dataset.k]??0;
  });
}

function offDays(e){
  let off=new Set((e.unavailable||[]).slice(0,7-state.settings.weeklyDays));
  let need=7-state.settings.weeklyDays-off.size;
  let candidates=DAYS.filter(d=>!off.has(d));

  if(need>0&&state.settings.consecutiveOff&&need===2){
    let pairs=[];
    for(let i=0;i<DAYS.length;i++){
      pairs.push([DAYS[i],DAYS[(i+1)%DAYS.length]]);
    }

    let valid=pairs.filter(p=>!p.some(d=>off.has(d)));
    if(valid.length)return new Set(rand(valid));
  }

  shuffle(candidates).slice(0,need).forEach(d=>off.add(d));
  return off;
}

function empByName(n){
  return state.employees.find(e=>e.name===n)||{name:n,team:'Team A',role:'Junior'};
}

function bestShift(name,m,a){
  const pen=(names)=>{
    let all=[...names,name].map(empByName);
    let teams=new Set(all.map(e=>e.team));
    let roles=new Set(all.map(e=>e.role));
    let s=0;

    if(!teams.has('Team A'))s+=25;
    if(!teams.has('Team B'))s+=25;
    if(!roles.has('Team Leader')&&!roles.has('Senior'))s+=35;

    return s;
  };

  let mp=pen(m),ap=pen(a);
  return mp<ap?'Morning':ap<mp?'Afternoon':rand(SHIFTS);
}

function shiftLeader(schedule,day,shift){
  let names=state.employees
    .filter(e=>schedule[e.name][day].shift===shift)
    .map(e=>e.name);

  let tl=names.filter(n=>empByName(n).role==='Team Leader').sort()[0];
  if(tl)return tl;

  return names.filter(n=>empByName(n).role==='Senior').sort()[0]||null;
}

function candidate(){
  let schedule={};

  state.employees.forEach(e=>{
    schedule[e.name]={};
    let off=offDays(e);

    DAYS.forEach(d=>{
      schedule[e.name][d]={
        shift:off.has(d)||e.unavailable.includes(d)?'Off':'Work',
        location:'-'
      };
    });
  });

  DAYS.forEach(day=>{
    let r=state.rules[day];
    let officeClosed=(state.settings.officeHolidays||[]).includes(day);

    let workers=shuffle(
      state.employees
        .filter(e=>schedule[e.name][day].shift==='Work')
        .map(e=>e.name)
    );

    workers.forEach(name=>{
      let m=state.employees
        .filter(e=>schedule[e.name][day].shift==='Morning')
        .map(e=>e.name);

      let a=state.employees
        .filter(e=>schedule[e.name][day].shift==='Afternoon')
        .map(e=>e.name);

      let mg=r.morning-m.length;
      let ag=r.afternoon-a.length;

      schedule[name][day].shift=
        mg>ag?'Morning':
        ag>mg?'Afternoon':
        bestShift(name,m,a);
    });

    state.employees
      .filter(e=>schedule[e.name][day].shift==='Afternoon')
      .forEach(e=>schedule[e.name][day].location='From Home');

    let morning=state.employees
      .filter(e=>schedule[e.name][day].shift==='Morning')
      .map(e=>e.name);

    let eligible=shuffle(morning.filter(n=>!empByName(n).homeOnly));
    let forced=morning.filter(n=>empByName(n).homeOnly);

    eligible.forEach((n,i)=>{
      schedule[n][day].location=
        officeClosed
          ? 'From Home'
          : i<Math.min(r.office,eligible.length)
            ? 'Office'
            : 'From Home';
    });

    forced.forEach(n=>schedule[n][day].location='From Home');
  });

  return schedule;
}

function score(schedule){
  let score=0;

  let report={
    summary:{
      uncovered:0,
      extra:0,
      locationMismatch:0,
      dayMismatch:0,
      teamMissing:0,
      leaderMissing:0
    },
    daily:{},
    employees:{}
  };

  DAYS.forEach(day=>{
    let r=state.rules[day];
    let am=0,aa=0,ao=0,ah=0;

    state.employees.forEach(e=>{
      let x=schedule[e.name][day];
      if(x.shift==='Morning')am++;
      if(x.shift==='Afternoon')aa++;
      if(x.location==='Office')ao++;
      if(x.location==='From Home')ah++;
    });

    let miss=Math.max(0,r.morning-am)+Math.max(0,r.afternoon-aa);
    let extra=Math.max(0,am-r.morning)+Math.max(0,aa-r.afternoon);
    let loc=Math.abs(r.office-ao)+Math.abs(r.fromHome-ah);

    let teamMissing=0;
    let leaderMissing=0;

    SHIFTS.forEach(s=>{
      let names=state.employees
        .filter(e=>schedule[e.name][day].shift===s)
        .map(e=>e.name);

      if(names.length){
        let teams=new Set(names.map(n=>empByName(n).team));

        if(!teams.has('Team A'))teamMissing++;
        if(!teams.has('Team B'))teamMissing++;
        if(!shiftLeader(schedule,day,s))leaderMissing++;
      }
    });

    score+=miss*120+extra*40+loc*15+teamMissing*80+leaderMissing*120;

    report.summary.uncovered+=miss;
    report.summary.extra+=extra;
    report.summary.locationMismatch+=loc;
    report.summary.teamMissing+=teamMissing;
    report.summary.leaderMissing+=leaderMissing;

    report.daily[day]={
      requested:r,
      actual:{morning:am,afternoon:aa,office:ao,fromHome:ah},
      morningLeader:shiftLeader(schedule,day,'Morning'),
      afternoonLeader:shiftLeader(schedule,day,'Afternoon')
    };
  });

  state.employees.forEach(e=>{
    let worked=DAYS.filter(d=>SHIFTS.includes(schedule[e.name][d].shift)).length;
    let diff=Math.abs(worked-state.settings.weeklyDays);

    score+=diff*90;
    report.summary.dayMismatch+=diff;
    report.employees[e.name]={worked,target:state.settings.weeklyDays};
  });

  return [score,report];
}

function generate(){
  saveRules();

  if(!state.employees.length)return alert('Add employees first');

  let best=null,bestScore=Infinity,bestReport=null;

  for(let i=0;i<state.settings.iterations;i++){
    let c=candidate();
    let [s,r]=score(c);

    if(s<bestScore){
      best=c;
      bestScore=s;
      bestReport=r;

      if(s===0)break;
    }
  }

  state.schedule=best;
  state.score=bestScore;
  state.report=bestReport;

  save();

  scoreLabel.textContent=bestScore===0
    ? 'Perfect match ✅'
    : `Best approximation. Score: ${bestScore}`;

  renderSchedule();
  renderReport();
  showPage('schedule');
}

function renderSchedule(){
  if(!state.schedule){
    scheduleBox.innerHTML='<p class="muted">No schedule generated yet.</p>';
    return;
  }

  scoreLabel.textContent=state.score===0
    ? 'Perfect match ✅'
    : `Best approximation. Score: ${state.score}`;

  viewMode.value==='Day View'?renderDayView():renderEmpView();
}

function renderEmpView(){
  let html=`
    <div class="emp-table" style="grid-template-columns:160px repeat(7,135px)">
      <div class="cell header">Employee</div>
      ${DAYS.map(d=>`<div class="cell header">${d}</div>`).join('')}
  `;

  Object.entries(state.schedule).forEach(([name,days])=>{
    html+=`<div class="cell header">${name}</div>`;

    DAYS.forEach(d=>{
      let x=days[d];
      let cls=x.shift==='Off'?'off':x.shift==='Morning'?'morning':'afternoon';
      let leader=x.shift==='Morning'
        ? state.report.daily[d].morningLeader
        : state.report.daily[d].afternoonLeader;

      let star=name===leader?' ⭐':'';

      html+=`
        <div class="cell ${cls}">
          ${x.shift==='Off'?'OFF':`${x.shift}${star}\n${x.location}`}
        </div>
      `;
    });
  });

  html+='</div>';
  scheduleBox.innerHTML=html;
}

function renderDayView(){
  let html=`
    <div class="day-table">
      <div class="cell header">Day</div>
      <div class="cell header">Morning</div>
      <div class="cell header">Afternoon</div>
  `;

  DAYS.forEach(d=>{
    let m=[],a=[];

    Object.entries(state.schedule).forEach(([name,days])=>{
      let x=days[d];
      let e=empByName(name);
      let role=e.role==='Team Leader'?'TL':e.role==='Senior'?'Sr':'Jr';

      if(x.shift==='Morning'){
        m.push(`• ${name}${name===state.report.daily[d].morningLeader?' ⭐':''} (${e.team}, ${role}, ${x.location==='Office'?'Office':'Home'})`);
      }

      if(x.shift==='Afternoon'){
        a.push(`• ${name}${name===state.report.daily[d].afternoonLeader?' ⭐':''} (${e.team}, ${role}, Home)`);
      }
    });

    html+=`
      <div class="cell header">${d}</div>
      <div class="cell morning day-cell">${m.join('\n')||'No one assigned'}</div>
      <div class="cell afternoon day-cell">${a.join('\n')||'No one assigned'}</div>
    `;
  });

  html+='</div>';
  scheduleBox.innerHTML=html;
}

function renderReport(){
  if(!state.report){
    reportBox.textContent='Generate a schedule first.';
    return;
  }

  let s=state.report.summary;

  let txt=`ShiftFlow Pro Report
Designed by Shreef Ammar 2026

Rules:
- Afternoon shifts are always From Home.
- Home Only employees never work Office.
- Every active shift tries to include Team A + Team B and a Shift Leader.

Score: ${state.score}
Uncovered shifts: ${s.uncovered}
Extra shifts: ${s.extra}
Location mismatch: ${s.locationMismatch}
Employee work-day mismatch: ${s.dayMismatch}
Missing Team A/B points: ${s.teamMissing}
Missing leader points: ${s.leaderMissing}

Daily Details:
`;

  DAYS.forEach(d=>{
    let x=state.report.daily[d];

    txt+=`- ${d}: Morning ${x.actual.morning}/${x.requested.morning}, Afternoon ${x.actual.afternoon}/${x.requested.afternoon}, Office ${x.actual.office}/${x.requested.office}, Home ${x.actual.fromHome}/${x.requested.fromHome}, Morning Leader: ${x.morningLeader||'None'}, Afternoon Leader: ${x.afternoonLeader||'None'}
`;
  });

  reportBox.textContent=txt;
}

async function exportExcel(){
  if(!state.schedule)return alert('Generate a schedule first');
  if(typeof ExcelJS==='undefined')return alert('Excel library is still loading. Try again in a few seconds.');

  const wb=new ExcelJS.Workbook();
  wb.creator='ShiftFlow Pro Web';
  wb.created=new Date();

  const colors={
    title:'1F4E78',header:'243A73',darkText:'0B1020',white:'FFFFFF',
    name:'D9E2F3',off:'F4CCCC',morning:'D9EAD3',afternoon:'D9D2E9',
    report:'EAF1F8',border:'D9E2F3',footer:'FFF2CC'
  };

  const thin={style:'thin',color:{argb:colors.border}};
  const border={top:thin,left:thin,bottom:thin,right:thin};

  function styleTitle(ws,lastCol,title){
    ws.mergeCells(1,1,1,lastCol);

    const c=ws.getCell(1,1);
    c.value=title;
    c.font={bold:true,size:18,color:{argb:colors.white}};
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:colors.title}};
    c.alignment={horizontal:'center',vertical:'middle'};
    ws.getRow(1).height=30;

    ws.mergeCells(2,1,2,lastCol);

    const f=ws.getCell(2,1);
    f.value='Designed by Shreef Ammar 2026';
    f.font={bold:true,size:12,color:{argb:'7A5A00'}};
    f.fill={type:'pattern',pattern:'solid',fgColor:{argb:colors.footer}};
    f.alignment={horizontal:'center',vertical:'middle'};
  }

  function styleHeader(row){
    row.eachCell(c=>{
      c.font={bold:true,color:{argb:colors.white}};
      c.fill={type:'pattern',pattern:'solid',fgColor:{argb:colors.header}};
      c.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      c.border=border;
    });
  }

  function paint(cell,color){
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:color}};
    cell.border=border;
    cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
  }

  const empWs=wb.addWorksheet('Employee View',{views:[{state:'frozen',xSplit:1,ySplit:4}]});

  styleTitle(empWs,8,'ShiftFlow Pro - Employee View');
  empWs.addRow([]);

  const empHeader=empWs.addRow(['Employee',...DAYS]);
  styleHeader(empHeader);

  Object.entries(state.schedule).forEach(([name,days])=>{
    const row=empWs.addRow([
      name,
      ...DAYS.map(d=>{
        const x=days[d];

        if(x.shift==='Off')return 'OFF';

        const l=x.shift==='Morning'
          ? state.report.daily[d].morningLeader
          : state.report.daily[d].afternoonLeader;

        return `${x.shift}${name===l?' ⭐':''}\n${x.location}`;
      })
    ]);

    row.height=42;
    row.getCell(1).font={bold:true,color:{argb:colors.darkText}};
    paint(row.getCell(1),colors.name);

    DAYS.forEach((d,i)=>{
      const x=days[d];
      const cell=row.getCell(i+2);

      paint(cell,x.shift==='Off'
        ? colors.off
        : x.shift==='Morning'
          ? colors.morning
          : colors.afternoon
      );

      cell.font={bold:true,color:{argb:colors.darkText}};
    });
  });

  empWs.columns=[{width:20},...DAYS.map(()=>({width:18}))];
  empWs.eachRow(r=>r.eachCell(c=>c.border=border));

  const dayWs=wb.addWorksheet('Day View',{views:[{state:'frozen',xSplit:1,ySplit:4}]});

  styleTitle(dayWs,3,'ShiftFlow Pro - Day View');
  dayWs.addRow([]);

  const dayHeader=dayWs.addRow(['Day','Morning','Afternoon']);
  styleHeader(dayHeader);

  DAYS.forEach(d=>{
    let m=[],a=[];

    Object.entries(state.schedule).forEach(([name,days])=>{
      const x=days[d];
      const e=empByName(name);
      const role=e.role==='Team Leader'?'TL':e.role==='Senior'?'Sr':'Jr';

      if(x.shift==='Morning'){
        m.push(`${name}${name===state.report.daily[d].morningLeader?' ⭐':''} (${e.team}, ${role}, ${x.location})`);
      }

      if(x.shift==='Afternoon'){
        a.push(`${name}${name===state.report.daily[d].afternoonLeader?' ⭐':''} (${e.team}, ${role}, From Home)`);
      }
    });

    const row=dayWs.addRow([d,m.join('\n')||'No one assigned',a.join('\n')||'No one assigned']);

    row.height=82;
    row.getCell(1).font={bold:true,color:{argb:colors.darkText}};
    paint(row.getCell(1),colors.name);
    paint(row.getCell(2),colors.morning);
    paint(row.getCell(3),colors.afternoon);

    row.getCell(2).font={bold:true,color:{argb:colors.darkText}};
    row.getCell(3).font={bold:true,color:{argb:colors.darkText}};
    row.getCell(2).alignment={horizontal:'left',vertical:'top',wrapText:true};
    row.getCell(3).alignment={horizontal:'left',vertical:'top',wrapText:true};
  });

  dayWs.columns=[{width:18},{width:46},{width:46}];

  const repWs=wb.addWorksheet('Report');

  styleTitle(repWs,4,'ShiftFlow Pro - Report');
  repWs.addRow([]);

  const rh=repWs.addRow(['Metric','Value','','Notes']);
  styleHeader(rh);

  const rows=[
    ['Score',state.score,'','Lower is better. 0 means perfect match.'],
    ['Uncovered shifts',state.report.summary.uncovered,'',''],
    ['Extra shifts',state.report.summary.extra,'',''],
    ['Location mismatch',state.report.summary.locationMismatch,'',''],
    ['Employee day mismatch',state.report.summary.dayMismatch,'',''],
    ['Missing Team A/B',state.report.summary.teamMissing,'',''],
    ['Missing leaders',state.report.summary.leaderMissing,'',''],
    ['Rule','Afternoon = From Home','','Home Only never works Office'],
    ['Leader rule','Team Leader first, otherwise Senior','','⭐ marks Shift Leader']
  ];

  rows.forEach(r=>{
    const row=repWs.addRow(r);

    row.eachCell(c=>{
      c.border=border;
      c.alignment={vertical:'middle',wrapText:true};
    });

    row.getCell(1).font={bold:true,color:{argb:colors.darkText}};
    row.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:colors.report}};
  });

  repWs.addRow([]);

  const dh=repWs.addRow(['Day','Morning','Afternoon','Leaders']);
  styleHeader(dh);

  DAYS.forEach(d=>{
    const x=state.report.daily[d];

    const row=repWs.addRow([
      d,
      `${x.actual.morning}/${x.requested.morning}`,
      `${x.actual.afternoon}/${x.requested.afternoon}`,
      `Morning: ${x.morningLeader||'None'}\nAfternoon: ${x.afternoonLeader||'None'}`
    ]);

    row.height=34;

    row.eachCell(c=>{
      c.border=border;
      c.alignment={vertical:'middle',wrapText:true};
    });
  });

  repWs.columns=[{width:22},{width:18},{width:18},{width:42}];

  const buffer=await wb.xlsx.writeBuffer();

  const blob=new Blob(
    [buffer],
    {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
  );

  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='shiftflow_schedule.xlsx';
  a.click();

  URL.revokeObjectURL(a.href);
}

function backup(){
  let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  let a=document.createElement('a');

  a.href=URL.createObjectURL(blob);
  a.download='shiftflow_backup.json';
  a.click();
}

function restore(e){
  let f=e.target.files[0];
  if(!f)return;

  let r=new FileReader();

  r.onload=()=>{
    state=JSON.parse(r.result);
    save();
    renderAll();
    alert('Backup loaded');
  };

  r.readAsText(f);
}

init();
