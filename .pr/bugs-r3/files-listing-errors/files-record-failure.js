async page => {
  const origin='http://localhost:__PORT__';
  const p=page.context().browser().contexts().flatMap(c=>c.pages()).find(p=>p.video() && p.url().startsWith(origin));
  if(!p) throw new Error('Recording page missing');
  const output='C:/Users/ASUS/Desktop/GitHub_project/oss-contributions/research/openhands-r3-20261110/output/playwright';
  const response=p.waitForResponse(r=>r.request().method()==='POST' && r.url().includes('execute'),{timeout:20000});
  await p.getByTestId('files-tab-refresh').click();
  const r=await response;
  const command=await r.json();
  await p.getByTestId('files-tab-refresh').waitFor({state:'visible'});
  await p.waitForTimeout(800);
  const retained={listingVisible:await p.getByText('listing-validation.txt',{exact:true}).count()>0,alert:await p.getByTestId('files-tab').getByRole('alert').count()>0,text:await p.getByTestId('files-tab').innerText()};
  await p.screenshot({path:`${output}/files-__LABEL__-retained-__ATTEMPT__.png`});
  await p.reload();
  await p.getByTestId('files-tab').or(p.getByRole('button',{name:'Show panel',exact:true})).first().waitFor({timeout:15000});
  if(await p.getByRole('button',{name:'Show panel',exact:true}).isVisible()) await p.getByRole('button',{name:'Show panel',exact:true}).click();
  await p.getByTestId('files-tab-refresh').waitFor({timeout:15000});
  await p.waitForTimeout(800);
  const fresh={noFiles:await p.getByText('No files in workspace',{exact:true}).count()>0,alert:await p.getByTestId('files-tab').getByRole('alert').count()>0,text:await p.getByTestId('files-tab').innerText()};
  await p.screenshot({path:`${output}/files-__LABEL__-initial-__ATTEMPT__.png`});
  await p.waitForTimeout(600);
  return {label:'__LABEL__',attempt:__ATTEMPT__,command,retained,fresh};
}
