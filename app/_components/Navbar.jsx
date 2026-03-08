"use client"
import Link from 'next/link'

import { useSession, signIn, signOut } from "next-auth/react"

export default function Component() {  
  const { data: session } = useSession()  
     
  return (      
    <nav>
      <Link href="/"><span>Goodplay</span></Link>        
      {session 
        ? <div>
            <button onClick={() => signOut()}>Sign out</button>
            
          </div>
        : <div>
            <button onClick={() => signIn()}>Sign in</button>
            <button onClick={() => window.location.href = "/register"}>Register</button>
          </div>
      }     
    </nav>    
  )  
}