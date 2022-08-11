import { Fragment } from "react";
import { Tab } from "@headlessui/react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./routes/Home";
import Main from "./routes/closure/Main";
import Navbar from "./components/Navbar";
import Login from "./routes/Login";

function App() {
    return (
        <div className="font-mono">
            {/* <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                    <Tab as={Fragment}>
                        {({ selected }) => <button className={selected ? `bg-blue-500 text-white p-2 px-4 w-full` : `bg-white text-black`}>Home</button>}
                    </Tab>
                    <Tab as={Fragment}>
                        {({ selected }) => <button className={selected ? `bg-blue-500 text-white p-2 px-4 w-full` : `bg-white text-black`}>Bot</button>}
                    </Tab>
                    <Tab as={Fragment}>
                        {({ selected }) => <button className={selected ? `bg-blue-500 text-white p-2 px-4 w-full` : `bg-white text-black`}>Web</button>}
                    </Tab>
                </Tab.List>
            </Tab.Group> */}
            <Navbar />
            <div className="mx-auto max-w-7xl">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="closure" element={<Main />} />
                    <Route path="login" element={<Login />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;
