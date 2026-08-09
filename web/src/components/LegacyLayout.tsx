import { Outlet } from "react-router";
import { ToastContainer } from "react-toastify";
import Navbar from "../components/Navbar";

export default function LegacyLayout() {
    return (
        <div className="font-mono">
            <Navbar />
            <div className="mx-auto max-w-sm sm:max-w-lg lg:max-w-4xl xl:max-w-7xl pt-28">
                <ToastContainer hideProgressBar={true} autoClose={3000} pauseOnHover={false} />
                <Outlet />
            </div>
        </div>
    );
}
