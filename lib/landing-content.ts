export type CustomerReview = {
  id: string;
  name: string;
  area: string;
  product: string;
  rating: number;
  quote: string;
  image: string;
};

export const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: "review-1",
    name: "Ananya R.",
    area: "Indiranagar",
    product: "Classic Tiramisu",
    rating: 5,
    quote:
      "The layers are insane — creamy, coffee-rich, and not too sweet. Ordered for a dinner party and everyone asked where it's from!",
    image: "/landing/hero-scoop.png",
  },
  {
    id: "review-2",
    name: "Rohit K.",
    area: "HSR Layout",
    product: "Tres Leches",
    rating: 5,
    quote:
      "Soaked perfectly and melts in your mouth. You can tell it's made fresh — delivery was on time and beautifully packed.",
    image: "/landing/tres-leches.png",
  },
  {
    id: "review-3",
    name: "Meera S.",
    area: "Koramangala",
    product: "Tres Leches Slice",
    rating: 5,
    quote:
      "The cake that actually melts! Shared this with family and it was gone in minutes. Already planning my next order.",
    image: "/landing/tres-leches-slice.png",
  },
  {
    id: "review-4",
    name: "Divya P.",
    area: "Whitefield",
    product: "Classic Tiramisu",
    rating: 5,
    quote:
      "Every layer tells a story — you can see the care in how it's packed and presented. My new go-to for celebrations.",
    image: "/landing/layers-story.png",
  },
];
