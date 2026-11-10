async page => {
  const origin='http://localhost:__PORT__';
  const storage=await page.context().storageState();
  const source=storage.origins.find(o=>o.origin==='http://localhost:3390');
  const localStorage=(source?.localStorage??[]).filter(v=>!['openhands-backends','openhands-active-backend'].includes(v.name));
  const context=await page.context().browser().newContext({storageState:{cookies:[],origins:[{origin,localStorage}]},viewport:{width:__WIDTH__,height:__HEIGHT__},recordVideo:{dir:'C:/Users/ASUS/Desktop/GitHub_project/oss-contributions/research/openhands-r3-20261110/output/playwright/raw',size:{width:__WIDTH__,height:__HEIGHT__}}});
  const p=await context.newPage();
  await p.goto(`${origin}/conversations/__CID__`);
  await p.getByTestId('chat-scroll-container').waitFor({state:'attached',timeout:15000});
  await p.waitForTimeout(800);
  if(await p.getByTestId('confirm-telemetry-preferences').isVisible()) {
    await p.getByRole('checkbox').first().uncheck();
    await p.getByTestId('confirm-telemetry-preferences').click();
  }
  if(await p.getByTestId('onboarding-skip').isVisible()) await p.getByTestId('onboarding-skip').click();
  if(await p.getByRole('button',{name:'Show panel',exact:true}).isVisible()) await p.getByRole('button',{name:'Show panel',exact:true}).click();
  await p.getByTestId('files-tab').waitFor({timeout:15000});
  await p.getByText('listing-validation.txt',{exact:true}).waitFor({timeout:15000});
  return {recording:true,healthyListingVisible:true};
}
