import { ToastContainer } from "react-toastify";
import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./routes/Home";
import Main from "./routes/closure/Main";
import Navbar from "./components/Navbar";
import Login from "./routes/Login";
import Tags from "./routes/closure/Tags";
import Guilds from "./routes/closure/Guilds";
import Test from "./routes/Test";

import "react-toastify/dist/ReactToastify.css";
import { RecoilRoot } from "recoil";
import Reminder from "./routes/closure/Reminder";
import ReminderDetails from "./routes/closure/Reminder/Details";
import ProfilePage from "./routes/profile/Profile";

function App() {
    return (
        <RecoilRoot>
            <div className="font-mono">
                <Navbar />
                <div className="mx-auto max-w-sm sm:max-w-lg lg:max-w-4xl xl:max-w-7xl pt-28">
                    <ToastContainer hideProgressBar={true} autoClose={3000} pauseOnHover={false} />
                    <Routes>
                        <Route index element={<Home />} />
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
                        <Route path="login" element={<Login />} />
                        <Route path="test" element={<Test />} />
                        <Route path="profile">
                            <Route index element={<ProfilePage />} />
                        </Route>
                    </Routes>
                </div>
            </div>
        </RecoilRoot>
    );
}

export default App;
