import getSongs from "@/actions/getSongs";
import Header from "@/components/Header";
import ListItem from "@/components/ListItem";
import PageContent from "./components/PageContent";

export const revalidate = 0

export default async function Home() {
  const { songs, nextCursor } = await getSongs()

  return (
    <div className="bg-neutral-900 rounded-lg h-full overflow-auto overflow-y-auto w-[100vw] md:w-[70vw]">
      <Header>
        <div className="mb-2">
          <h1 className="text-white text-3xl font-semibold">
            Welcome to Notify!
          </h1>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-3 mt-4"
          >
            <ListItem 
              image="/images/liked.png" 
              name="Liked Songs"
              href="liked"
            />
          </div>
        </div>
      </Header>
      <div className="mt-2 mb-7 px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-2xl font-semibold">
            Newest songs
          </h1>
        </div>
        <PageContent songs={songs} nextCursor={nextCursor} />
      </div>
    </div>
  )
}
