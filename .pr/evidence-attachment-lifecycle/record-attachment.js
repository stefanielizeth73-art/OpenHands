async page => {
  const label='__LABEL__';
  const origin='http://localhost:__PORT__';
  const output='C:/Users/ASUS/Desktop/GitHub_project/oss-contributions/research/openhands-r3-20261110/output/playwright';
  const context=await page.context().browser().newContext({storageState:await page.context().storageState(),viewport:{width:1280,height:800},recordVideo:{dir:`${output}/raw`,size:{width:1280,height:800}}});
  const p=await context.newPage();
  const results=[];
  async function navigate(name) {
    const link=p.getByRole('link',{name,exact:true});
    if(!await link.isVisible()) await p.getByTestId('sidebar-mobile-menu-toggle').click();
    await link.click();
    await p.getByTestId('sidebar-mobile-drawer').waitFor({state:'detached'});
  }
  try {
    await p.goto(origin);
    if(await p.getByTestId('confirm-telemetry-preferences').isVisible()) {
      const consent=p.getByRole('checkbox');
      if(await consent.isChecked()) await consent.uncheck();
      await p.getByTestId('confirm-telemetry-preferences').click();
    }
    if(await p.getByTestId('onboarding-skip').isVisible()) await p.getByTestId('onboarding-skip').click();
    await p.getByTestId('upload-image-input').waitFor({state:'attached'});
    await navigate('Customize');
    await p.waitForURL(/\/(?:mcp|customize)(?:\/|$)/);
    await navigate('New Chat');
    await p.getByTestId('upload-image-input').waitFor({state:'attached'});
    for(let attempt=1;attempt<=2;attempt++) {
      await p.waitForTimeout(600);
      await p.evaluate(async () => {
        const input=document.querySelector('[data-testid=upload-image-input]');
        const transfer=new DataTransfer();
        for(let i=0;i<1000;i++) transfer.items.add(new File([new Uint8Array(2048)],`race-file-${String(i).padStart(4,'0')}.txt`,{type:'text/plain'}));
        input.files=transfer.files;
        input.dispatchEvent(new Event('change',{bubbles:true}));
        const toggle=document.querySelector('[data-testid=sidebar-mobile-menu-toggle]');
        if(toggle && toggle.getBoundingClientRect().width>0) {
          toggle.click();
          await Promise.resolve();
        }
        document.querySelector('a[href="/customize"]').click();
      });
      await p.waitForURL(/\/(?:mcp|customize)(?:\/|$)/);
      await p.waitForTimeout(1800);
      await navigate('New Chat');
      await p.getByTestId('upload-image-input').waitFor({state:'attached'});
      const stale=await p.getByText('race-file-0000.txt',{exact:true}).count()>0;
      results.push({attempt,selectedFiles:1000,totalBytes:2048000,staleAttachmentVisible:stale});
      await p.screenshot({path:`${output}/attachment-${label}-${attempt}.png`});
      await p.waitForTimeout(1000);
      await navigate('Customize');
      await p.waitForURL(/\/(?:mcp|customize)(?:\/|$)/);
      await navigate('New Chat');
      await p.getByTestId('upload-image-input').waitFor({state:'attached'});
    }
    return {label,results};
  } finally {
    await context.close();
    await p.video().saveAs(`${output}/attachment-${label}.webm`);
  }
}
