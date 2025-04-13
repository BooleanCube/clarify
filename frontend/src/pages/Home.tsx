import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import hero from "../assets/hero.svg";
import bulb from "../assets/lightbulb.png";
import sparkle from "../assets/titlesparkle.svg";
import FeatureCarousel from "../components/ui/FeatureCarousel"


const Home: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);
  return (
    <>
      <section className="flex flex-col-reverse lg:flex-row items-center justify-between px-6 mt-10 lg:px-20 py-14 shadow-xl bg-offwhite" id="home">
        <div className="lg:w-1/2 text-center lg:text-left space-y-6">
          <h1 className="text-3xl tracking-wide lg:text-5xl font-bold">
            A dyslexia converter for your everyday basic needs
          </h1>
          <p className="text-xl tracking-wider ">
            Easily customize your files, texts, and images into your own customized format.
          </p>
          <button className="px-6 py-2 bg-darkgray hover:bg-darkgray/80 hover:shadow-md/30 hover:-translate-y-0.5 rounded-full border-[1.5px] border-black text-black tracking-wider transition-all cursor-pointer">
            Try Now
          </button>
        </div>
        <div className="lg:w-1/2 m-10 lg:mt-0">
          <img
            src={hero}
            alt="hero"
            className="w-full h-auto transition-all duration-300 ease-in-out"
          />
        </div>
      </section>

      <section className="flex flex-col-reverse lg:flex-row items-center justify-between px-6 lg:px-20 py-22" id="about">
        <div className="lg:w-1/2 text-center lg:text-left space-y-6">
          <h1 className="text-3xl lg:text-5xl tracking-wide font-bold">
          Clarify simplifies everyday digital tasks
          </h1>
          <p className="text-xl  tracking-wider">
          Whether you’re converting documents, text, or images, we make it seamless and fast so you can focus on what matters most.
          </p>
        </div>
        <div className="lg:w-1/4 w-1/3 m-10 py-12 lg:mt-0">
          <img
            src={bulb}
            alt="hero"
            className="w-full h-auto transition-all duration-300 ease-in-out"
          />
        </div>
      </section>
      
      <section className="px-6 lg:px-20 pb-12" id="features">
        <div className="flex flex-row pb-12">
        <img
              src={sparkle}
              alt="sparkle-bullet-point"
              className="w-14 h-auto transition-all duration-300 ease-in-out"
          />
        <h2 className="text-3xl tracking-wider lg:text-4xl font-bold text-center sparkle-text pl-4">Key Features</h2>
        </div>
        <FeatureCarousel />
      </section>
      <section className="px-6 lg:px-20 py-16" id="demo">
        <div className="flex flex-row pb-12">
        <img
              src={sparkle}
              alt="sparkle-bullet-point"
              className="w-14 h-auto transition-all duration-300 ease-in-out"
          />
        <h2 className="text-3xl tracking-wider lg:text-4xl font-bold text-center sparkle-text pl-4">How to use Clarify</h2>
        
        </div>
        <iframe className="w-full h-96" src="https://www.youtube.com/embed/YSWMYnuOImg?si=FzVo7W5Z32MRkHwO" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

      </section>
    </>
  );
};

export default Home
