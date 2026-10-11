import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import SupportAttachmentEditor from './SupportAttachmentEditor';
afterEach(cleanup);
it('links a measured support with explicit gap and allows disconnection without discarding post records',()=>{
 const saved=vi.fn(),initial=porchSiteFixture();initial.posts[1].pointType='existing_post';
 function Harness(){const [data,setData]=useState(initial);return <SupportAttachmentEditor data={data} post={data.posts[1]} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);saved(next);return next;})} lang="en"/>;}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Choose measured column or wall'}));expect(saved.mock.calls.at(-1)![0].posts[1].supportAttachment.gap).toBe('');
 fireEvent.change(screen.getByLabelText('Measured support'),{target:{value:'column-1'}});fireEvent.change(screen.getByLabelText('Support face'),{target:{value:'left'}});
 const inch=screen.getByLabelText(/From near edge · inches/);fireEvent.change(inch,{target:{value:'2 1/2'}});fireEvent.blur(inch);
 fireEvent.change(screen.getByLabelText('Rail end to support face gap · inches'),{target:{value:'1/8'}});fireEvent.change(screen.getByLabelText('Rail datum above support bottom · inches'),{target:{value:'0'}});
 expect(saved.mock.calls.at(-1)![0].posts[1].supportAttachment).toMatchObject({objectId:'column-1',face:'left',along:.3125,gap:'1/8',elevation:'0'});
 fireEvent.click(screen.getByRole('button',{name:'Disconnect support'}));const latest=saved.mock.calls.at(-1)![0];expect(latest.posts[1].supportAttachment).toBeNull();delete latest.posts[1].supportAttachment;expect(latest).toEqual(initial);
});
