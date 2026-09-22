import { createRoot } from 'react-dom/client'
import Navbar from '@/pages/Home/Navbar'
import UserProfile from './pages/Profile/UserProfile'

const el = document.getElementById("profile-app")
if (el) {
    createRoot(el).render(
        <>
            <Navbar />
            <UserProfile />
        </>
    )
}
