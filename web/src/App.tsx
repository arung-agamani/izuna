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

function App() {
    return (
        <div className="font-mono">
            <Navbar />
            <div className="mx-auto max-w-7xl">
                <ToastContainer hideProgressBar={true} autoClose={3000} pauseOnHover={false} />
                <Routes>
                    <Route index element={<Home />} />
                    <Route path="closure" element={<Main />}>
                        <Route index element={<p>Please select above menu</p>} />
                        <Route path="tags" element={<Tags />} />
                        <Route path="guilds" element={<Guilds />} />
                        <Route path="*" element={<p>Menu non existent</p>} />{" "}
                    </Route>
                    <Route path="login" element={<Login />} />
                    <Route path="test" element={<Test />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;
