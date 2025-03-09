// import type { ReactNode } from 'react';
// import { HomeLayout } from 'fumadocs-ui/layouts/home';
// import { baseOptions } from '@/app/layout.config';

// export default function Layout({ children }: { children: ReactNode }) {
//   return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
// }


import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
