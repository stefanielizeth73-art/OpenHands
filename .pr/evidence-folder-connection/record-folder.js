async page => {
  const label='__LABEL__';
  const port=__PORT__;
  const origin=`http://localhost:${port}`;
  const output='C:/Users/ASUS/Desktop/GitHub_project/oss-contributions/research/openhands-r3-20261110/output/playwright';
  async function keyFor(port) {
    const tab=await page.context().newPage();
    try { await tab.goto(`http://localhost:${port}`); return await tab.evaluate(()=>window.__AGENT_CANVAS_SESSION_API_KEY__); }
    finally { await tab.close(); }
  }
  const firstKey=await keyFor(3390);
  const secondKey=await keyFor(3400);
  const storage=await page.context().storageState();
  const source=storage.origins.find(o=>o.origin==='http://localhost:3390');
  const localStorage=(source?.localStorage??[]).filter(v=>!['openhands-backends','openhands-active-backend'].includes(v.name));
  localStorage.push({name:'openhands-backends',value:JSON.stringify([{id:'folder-validation',name:'Folder validation',kind:'local',host:'http://localhost:3390',apiKey:firstKey,connectionRevision:0}])});
  localStorage.push({name:'openhands-active-backend',value:JSON.stringify({backendId:'folder-validation',orgId:null})});
  const context=await page.context().browser().newContext({storageState:{cookies:[],origins:[{origin,localStorage}]},viewport:{width:1280,height:800},recordVideo:{dir:`${output}/raw`,size:{width:1280,height:800}}});
  const p=await context.newPage();
  async function folders() {
    await p.getByTestId('open-workspace-button').click();
    await p.getByRole('dialog').getByRole('button',{name:'Toggle menu'}).click();
    await p.getByRole('button',{name:'+ Add Workspace',exact:true}).click();
    await p.getByTestId('folder-browser-current-path').waitFor();
    await p.getByTestId('folder-browser-list').getByText('Loading...', {exact:true}).waitFor({state:'hidden'});
    return {path:await p.getByTestId('folder-browser-current-path').innerText(),listing:await p.getByTestId('folder-browser-list').innerText()};
  }
  async function closeFolders() {
    await p.getByTestId('folder-browser-cancel').click();
    await p.getByTestId('close-open-workspace-dialog').click();
  }
  async function edit(host,key) {
    if(!await p.getByRole('combobox').isVisible()) await p.getByTestId('sidebar-mobile-menu-toggle').click();
    await p.getByRole('combobox').click();
    await p.getByTestId('manage-backends-menu-item').click();
    await p.getByTestId('manage-backends-edit-Folder validation').click();
    await p.getByTestId('edit-backend-host').fill(host);
    await p.getByTestId('edit-backend-api-key').fill(key);
    await p.getByTestId('edit-backend-modal').getByRole('button',{name:'Save',exact:true}).click();
    await p.getByTestId('manage-backends-done').click();
    if(await p.getByTestId('sidebar-mobile-drawer-close').isVisible()) await p.getByTestId('sidebar-mobile-drawer-close').click();
  }
  const results=[];
  try {
    await p.goto(origin);
    await p.getByTestId('open-workspace-button').waitFor();
    const actualSecond=await context.request.get('http://localhost:3400/api/file/home',{headers:{'X-Session-API-Key':secondKey}});
    if(!actualSecond.ok()) throw new Error('Second runtime home probe failed');
    const expectedHome=(await actualSecond.json()).home;
    for(let attempt=1;attempt<=2;attempt++) {
      const first=await folders();
      if(!first.listing.includes('first-home-marker')) throw new Error('First runtime marker was not loaded');
      await closeFolders();
      await edit('http://localhost:3400',secondKey);
      const after=await folders();
      results.push({attempt,first,after,expectedHome,usesEditedConnection:after.path===expectedHome});
      await p.screenshot({path:`${output}/folder-${label}-${attempt}.png`});
      await p.waitForTimeout(1200);
      await closeFolders();
      await edit('http://localhost:3390',firstKey);
    }
    return {label,results};
  } finally {
    await context.close();
    await p.video().saveAs(`${output}/folder-${label}.webm`);
  }
}
