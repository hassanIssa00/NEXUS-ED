'use client'
import type { ReactNode } from 'react'
import RolePortalLayout from '@/components/layout/RolePortalLayout'
export default function Layout({ children }: { children: ReactNode }) { return <RolePortalLayout role="counselor">{children}</RolePortalLayout> }
