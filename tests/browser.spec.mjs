import {test,expect} from '@playwright/test';
const canonical={foundation:{version:'1.3.0'},designSystem:{version:'1.25.0'},sharedData:{version:'1.3.0'}};
function rows(){return [{id:'_meta',canonical},{id:'analytics',label:'DNS Analytics',shortLabel:'Analytics',group:'operations',lifecycle:'production',visible:true,order:1,dependencies:[],backend:{kind:'dns-core',label:'DNS Core'},description:{de:'Analyse',it:'Analisi'},versions:{app:'3.0.1',foundation:'1.3.0',designSystem:'1.25.0',sharedData:'1.3.0',canonical,state:{foundation:'up-to-date'},updateRequired:false},health:{connectivity:'pending',web:{state:'active'},firebase:{state:'pending'}},lastObservedAt:new Date().toISOString(),observations:{quality:'verified',main:{sha:'a'.repeat(40),app:'3.0.1',foundation:'1.4.0'},production:{sha:'b'.repeat(40),app:'3.0.1',foundation:'1.3.0',evidence:'lockfile-at-commit',installationVerified:false},deployment:{latest:{state:'failure'}},errors:[],sourceDiffersFromProduction:true}}];}
test.beforeEach(async({page})=>{
  const initial=rows();
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith('http://127.0.0.1:8741/'))return route.continue();
    if(url.includes('/firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const initializeApp=()=>({});'});
    if(url.includes('/firebase-firestore.js'))return route.fulfill({contentType:'text/javascript',body:`export const getFirestore=()=>({});export const collection=()=>({});export function onSnapshot(q,next,error){const emit=rows=>next({docs:rows.map(data=>({data:()=>data})),metadata:{fromCache:false}});queueMicrotask(()=>emit(${JSON.stringify(initial)}));const update=e=>emit(e.detail);const fail=()=>error({code:'unavailable'});window.addEventListener('fixture-registry',update);window.addEventListener('fixture-error',fail);return()=>{window.removeEventListener('fixture-registry',update);window.removeEventListener('fixture-error',fail);};}`});
    if(url.endsWith('/web-runtime/design-system.js'))return route.fulfill({contentType:'text/javascript',body:`export const DNS_DESIGN_SYSTEM={colors:{deep:'#0D4D5E',mid:'#417483',light:'#AAD0D1',background:'#F4F8F9',positive:'#047857',negative:'#b91c1c'}};`});
    return route.abort();
  });
});
test('live update, failed deploy, DE/IT and keyboard-accessible details',async({page})=>{
  await page.goto('/');await page.locator('details.technical-registry > summary').click();
  const row=page.locator('tr[data-registry-id="analytics"]');await expect(row.getByRole('cell').nth(2)).toHaveText('1.3.0');
  await page.locator('[data-lang="it"]').click();await expect(page.locator('html')).toHaveAttribute('lang','it');
  await row.locator('details > summary').focus();await page.keyboard.press('Enter');await expect(row.getByText('Non attestati; versione da lockfile/sorgente',{exact:true})).toBeVisible();await expect(row.getByText('failure',{exact:true})).toBeVisible();
  const changed=rows();changed[1].versions.foundation='1.4.0';changed[1].observations.production.foundation='1.4.0';changed[1].observations.deployment.latest.state='success';
  await page.evaluate(data=>window.dispatchEvent(new CustomEvent('fixture-registry',{detail:data})),changed);
  await expect(page.locator('tr[data-registry-id="analytics"]').getByRole('cell').nth(2)).toHaveText('1.4.0');
});
test('listener failure retains valid values and marks them stale',async({page})=>{
  await page.goto('/');await page.locator('details.technical-registry > summary').click();await expect(page.locator('tr[data-registry-id="analytics"]')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('fixture-error')));
  const row=page.locator('tr[data-registry-id="analytics"]');await expect(row.getByRole('cell').nth(2)).toHaveText('1.3.0');await expect(row.locator('[data-quality="stale"]')).toBeVisible();
});
