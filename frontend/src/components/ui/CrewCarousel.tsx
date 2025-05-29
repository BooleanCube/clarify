import { useState, useEffect } from 'react';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import github from '../../assets/github.svg'
import linkedin from '../../assets/linkedIn.svg'
import email from '../../assets/email.svg'
import left from '../../assets/left.svg'
import right from '../../assets/right.svg'
import kush from '../../assets/kush.jpg'
import shin from '../../assets/shin.jpg'
import arjun from '../../assets/arjun.png'
import samarth from '../../assets/samarth.jpeg'


interface CustomArrowProps {
  onClick?: () => void;
  direction: 'left' | 'right';
}

function CustomArrow({ onClick, direction }: CustomArrowProps) {
  const arrowSrc = direction === 'left' ? left : right;

  return (
    <div
      className={`absolute top-1/2 transform -translate-y-1/2 
                  ${direction === 'left' ? 'left-[-40px]' : 'right-[-40px]'}`}
      onClick={onClick}
    >
      <img src={arrowSrc} alt={`${direction} arrow`} className="w-8 h-8 cursor-pointer" />
    </div>
  );
}



const CrewCarousel = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth <= 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    dotsClass: "slick-dots",
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    nextArrow: <CustomArrow direction="right" />, 
    prevArrow: <CustomArrow direction="left" />,
    responsive: [
      { breakpoint: 768, settings: { slidesToShow: 1, slidesToScroll: 1 } }, 
      { breakpoint: 1024, settings: { slidesToShow: 2, slidesToScroll: 1 } }, 
      { breakpoint: 1280, settings: { slidesToShow: 3, slidesToScroll: 1 } }, 
      { breakpoint: 1440, settings: { slidesToShow: 4, slidesToScroll: 1 } }
    ],
  };
  
  

  const crewData = [
    { 
      name: "Kush Havinal", 
      role: "Backend + AI", 
      img: kush,
      github: "https://github.com/KushH305",
      linkedin: "https://www.linkedin.com/in/kush-havinal/",
      email: "mailto:kush.havinal@gmail.com"
    },
    { 
      name: "Thashin Bhuiyan", 
      role: "UX/UI + Lead Frontend", 
      img: shin,
      github: "https://github.com/thashin04",
      linkedin: "https://www.linkedin.com/in/thashin04/",
      email: "mailto:thashinbhuiyan04@gmail.com"
    },
    { 
      name: "Samarth Upadhya", 
      role: "Backend + AI", 
      img: samarth,
      github: "https://github.com/BooleanCube",
      linkedin: "https://www.linkedin.com/in/samarth-upadhya-9928ab243/",
      email: "mailto:samarthupadhya2309@gmail.com"
    },
    { 
      name: "Arjun Vooturi", 
      role: "Frontend", 
      img: arjun,
      github: "https://github.com/avvooturi",
      linkedin: "https://www.linkedin.com/in/arjun-vooturi-31914b250",
      email: "mailto:avvooturi@gmail.com"
    },
  ];

  return (
    <div className="w-full px-4 bg-lightgray py-20 pt-16">
      <h2 className="text-center text-black text-3xl font-extrabold mb-6">Meet the Team</h2>
      <div className="w-3/4 mx-auto">
        <Slider {...settings}>
          {crewData.map((member, index) => (
            <div key={index} className="flex flex-col items-center p-4 img-center sm:hover:scale-[107%] duration-300 transition-all ease-in-out">
              <div className="w-40 h-40 rounded-full border-2 border-black flex items-center justify-center duration-300 transition-all sm:hover:shadow-xl shadow-lg inline-none overflow-hidden">
                <img 
                  src={member.img} 
                  alt={member.name} 
                  className="w-full h-full items-center justify-center inline-none object-cover"
                />
              </div>
              <p className="mt-4 text-black text-center font-bold text-xl pb-1 ">{member.name}</p>
              <p className="text-black text-center">{member.role}</p>
              <div className="flex  gap-4 mt-4 pb-4 justify-center">
                <a href={member.github} target="_blank" rel="noopener noreferrer">
                  <img src={github} alt="GitHub" className="w-8 h-8 hover:opacity-85 transition-all duration-300 hover:scale-110" />
                </a>
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                  <img src={linkedin} alt="LinkedIn" className="w-8 h-8 hover:opacity-85 transition-all duration-300 hover:scale-110" />
                </a>
                <a href={member.email}>
                  <img src={email} alt="Email" className="w-8 h-8 hover:opacity-85 transition-all duration-300 hover:scale-110" />
                </a>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default CrewCarousel;
