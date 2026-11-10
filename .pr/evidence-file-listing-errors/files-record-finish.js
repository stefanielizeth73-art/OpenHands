async page => {
  const origin='http://localhost:__PORT__';
  const p=page.context().browser().contexts().flatMap(c=>c.pages()).find(p=>p.video() && p.url().startsWith(origin));
  if(!p) throw new Error('Recording page missing');
  await p.context().close();
  await p.video().saveAs('C:/Users/ASUS/Desktop/GitHub_project/oss-contributions/research/openhands-r3-20261110/output/playwright/files-__LABEL__.webm');
  return {saved:true};
}
