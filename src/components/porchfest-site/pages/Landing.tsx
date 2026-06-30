// @ts-nocheck
import Hero from '../sections/Hero';
import PhotoStrip from '../sections/PhotoStrip';
import About from '../sections/About';
import StatsBar from '../sections/StatsBar';
import Gallery from '../sections/Gallery';
import HowItWorks from '../sections/HowItWorks';
import SponsorBar from '../sections/SponsorBar';

export default function Landing() {
  return (
    <>
      <Hero />
      <PhotoStrip />
      <About />
      <StatsBar />
      <Gallery />
      <HowItWorks />
      <SponsorBar />
    </>
  );
}
