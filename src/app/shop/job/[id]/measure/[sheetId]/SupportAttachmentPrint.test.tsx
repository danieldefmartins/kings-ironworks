import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import SupportAttachmentPrint from './SupportAttachmentPrint';
afterEach(cleanup);
it('prints support identity, physical face offset, explicit gap and connection without inventing missing data',()=>{
 const data=porchSiteFixture();data.posts[1].pointType='existing_post';data.site!.objects.find(h=>h.id==='column-1')!.y='1';data.posts[1].supportAttachment={objectId:'column-1',face:'left',along:.25,angle:0,elevation:'0',gap:'1/8',connection:'Side clip to surveyed concrete; review anchors'};
 const before=JSON.stringify(data),view=render(<SupportAttachmentPrint data={data} posts={data.posts} lang="en"/>);expect(screen.getByText(/do not fabricate as steel posts/)).toBeTruthy();expect(screen.getByText(/P2 · Left column/)).toBeTruthy();expect(view.container.textContent).toContain('2" (near)');expect(view.container.textContent).toContain('1/8');expect(view.container.textContent).toContain('Side clip to surveyed concrete');expect(view.container.textContent).not.toContain('UNRESOLVED');expect(JSON.stringify(data)).toBe(before);
 data.site!.objects=[];data.posts[1].supportAttachment!.gap='';view.rerender(<SupportAttachmentPrint data={data} posts={data.posts} lang="en"/>);expect(screen.getByText(/MISSING SUPPORT/)).toBeTruthy();expect(screen.getByText(/UNRESOLVED/)).toBeTruthy();expect(view.container.textContent).toContain('Rail-to-face gap: VERIFY');
});
