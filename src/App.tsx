import { useState, useEffect } from 'react'
import { Box, Container, Spinner, Center, Text, VStack, useColorModeValue } from '@chakra-ui/react'
import UserSelection from './components/UserSelection'
import Dashboard from './components/Dashboard'
import { initializeUsers, getUser } from './services/firebase'

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bgColor = useColorModeValue('gray.50', 'gray.900')

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true)
        // Initialize both users
        await initializeUsers()
        // Verify users were created
        const dominik = await getUser('Dominik')
        const samu = await getUser('Samu')
        
        if (!dominik || !samu) {
          throw new Error('Failed to initialize users')
        }
        
        setError(null)
      } catch (err) {
        console.error('Initialization error:', err)
        setError('Failed to connect to database. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Center height="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text color={useColorModeValue('gray.800', 'white')}>Connecting to database...</Text>
          </VStack>
        </Center>
      </Box>
    )
  }

  if (error) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Center height="100vh">
          <Text color="red.500">{error}</Text>
        </Center>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 2, md: 4 }}>
        {!currentUser ? (
          <UserSelection onSelectUser={setCurrentUser} />
        ) : (
          <Dashboard currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
        )}
      </Container>
    </Box>
  )
}

export default App 