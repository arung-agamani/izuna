import { ToastContainer } from "react-toastify";
import { Routes, Route } from "react-router-dom";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Home from "./routes/Home";
import Main from "./routes/closure/Main";
import Navbar from "./components/Navbar";
import Login from "./routes/Login";
import Tags from "./routes/closure/Tags";
import Guilds from "./routes/closure/Guilds";
import Test from "./routes/Test";
import ProtectedRoute from "./components/ProtectedRoute";

import "react-toastify/dist/ReactToastify.css";
import Reminder from "./routes/closure/Reminder";
import ReminderDetails from "./routes/closure/Reminder/Details";
import ProfilePage from "./routes/profile/Profile";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <div className="font-mono">
                <Navbar />
                <div className="mx-auto max-w-sm sm:max-w-lg lg:max-w-4xl xl:max-w-7xl pt-28">
                    <ToastContainer hideProgressBar={true} autoClose={3000} pauseOnHover={false} />
                    <Routes>
                        <Route index element={<Home />} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="closure" element={<Main />}>
                                <Route index element={<p>Please select above menu</p>} />
                                <Route path="tags" element={<Tags />} />
                                <Route path="guilds" element={<Guilds />} />
                                <Route path="reminder">
                                    <Route index element={<Reminder />} />
                                    <Route path=":id" element={<ReminderDetails />} />
                                </Route>
                                <Route path="*" element={<p>Menu non existent</p>} />{" "}
                            </Route>
                        </Route>
                        <Route path="login" element={<Login />} />
                        <Route path="test" element={<Test />} />
                        <Route path="profile">
                            <Route index element={<ProfilePage />} />
                        </Route>
                    </Routes>
                </div>
            </div>
            {import.meta.env.DEV && <ReactQueryDevtools />}
        </QueryClientProvider>
    );
}

export default App;
