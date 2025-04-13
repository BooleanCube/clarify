"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselApi
} from "@/components/ui/Carousel"
import { Card } from "@/components/ui/Card"
import {
  FaFileImport,
  FaRegSmile,
  FaFont,
  FaAlignLeft,
  FaParagraph,
  FaVolumeUp,
} from "react-icons/fa"

const features = [
  {
    icon: <FaFileImport className="text-5xl text-primary" />,
    title: "Import Any File",
    description: "Upload PDFs, Docs, Images, or text. We extract it for you.",
  },
  {
    icon: <FaRegSmile className="text-5xl text-primary" />,
    title: "User-Friendly Interface",
    description: "Designed for simplicity and ease without distraction.",
  },
  {
    icon: <FaFont className="text-5xl text-primary" />,
    title: "Font Customization",
    description: "Choose dyslexia-friendly fonts, sizes, and weights.",
  },
  {
    icon: <FaAlignLeft className="text-5xl text-primary" />,
    title: "Layout Control",
    description: "Adjust line height, spacing, and background color.",
  },
  {
    icon: <FaParagraph className="text-5xl text-primary" />,
    title: "Paragraph Chunking",
    description: "Break long text into smaller chunks for better focus.",
  },
  {
    icon: <FaVolumeUp className="text-5xl text-primary" />,
    title: "Text-to-Speech",
    description: "Listen to your text with natural-sounding voice options.",
  },
]

export default function FeatureCarousel() {
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [current, setCurrent] = useState(0)

  // Sync current index on select
  const onSelect = useCallback(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
  }, [api])

  // Hook Embla's select event
  useEffect(() => {
    if (!api) return
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api, onSelect])

  const scrollTo = (index: number) => {
    if (!api) return
    api.scrollTo(index)
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <Carousel
        opts={{ loop: true }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {features.map((feature, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <Card className="h-full p-6 rounded-xl shadow-md bg-offwhite flex flex-col items-center justify-center text-center">
                <div>{feature.icon}</div>
                <h3 className="text-2xl font-bold tracking-wide">{feature.title}</h3>
                <p className="text-lg text-muted-foreground tracking-wide">{feature.description}</p>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* Dots */}
      <div className="flex justify-center space-x-3 mt-8">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full hover:cursor-pointer transition-all duration-300 ${
              current === index ? "opacity-85 bg-black scale-125" : "bg-darkgray"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
