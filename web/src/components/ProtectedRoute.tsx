import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../hooks/useUser";

const ProtectedRoute = () => {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-xl">Checking authentication...</p>
            </div>
        );
    }

    if (!user?.loginType) {
        const currentLocation = window.location.href;
        const urlEncoded = encodeURIComponent(currentLocation);
        const b64encoded = window.btoa(urlEncoded);
        return <Navigate to={`/login?redirect=${b64encoded}`} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
